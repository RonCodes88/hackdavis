from PIL import Image
import base64
from anthropic import Anthropic
import cv2
from ultralytics import YOLO
import hashlib
import shutil
import os
from dotenv import load_dotenv
curr_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(curr_dir, '..', '..', '.env')
load_dotenv(dotenv_path)

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
model = YOLO(os.path.join(curr_dir, "yolo11n.pt"))

parent_dir = os.path.dirname(curr_dir)
data_dir = os.path.join(parent_dir, "data")
image_dir = os.path.join(data_dir, "images")
pred_folder = os.path.join(data_dir, "img_to_predict")
result_folder = os.path.join(data_dir, "result")

def make_prediction(folder_name, pred_path):
    results = model.predict(pred_path, show=False, save=False, line_width=2, conf=0.01, save_crop=False,save_txt=False,show_labels=True,show_conf=False)
    image = Image.open(pred_path)
    im_path =  os.path.join(image_dir, folder_name)  # Directory to save the crops
    os.makedirs(im_path, exist_ok=True)
    # Loop through the detections and save each cropped image
    for idx, bbox in enumerate(results[0].boxes.xyxy.cpu().numpy()):
        x_min, y_min, x_max, y_max = bbox
        # Crop the image using the bounding box coordinates
        cropped_image = image.crop((x_min, y_min, x_max, y_max))
        # Save the cropped image with a predictable name (e.g., based on index)
        cropped_image.save(os.path.join(im_path, f"cropped_{idx}.jpg"))
        print(f"Saved crop {idx} at {im_path}")

    return results[0].boxes.xyxy.cpu().numpy()

  
def get_all_image_files(directory):
    image_files = []
    for filename in os.listdir(directory):
        image_files.append(os.path.join(directory, filename))
    
    # Sort by the numeric part after the underscore
    image_files.sort(key=lambda x: int(os.path.splitext(os.path.basename(x))[0].split("_")[1]))
    return image_files

def get_pantry_items_from_full_image(image_path):
    with open(image_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode("utf-8")

    response = client.messages.create(
        model="claude-3-7-sonnet-20250219",  
        max_tokens=1000,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": image_data}},
                {"type": "text", "text": "List all the food or pantry items visible in this image as one-word lowercase nouns, separated by commas. Be as specific as possible. Only include full/recognizable items."}
            ]
        }]
    )
    # Example response: "lettuce, tomato, milk, cheese"
    return response.content[0].text.strip()

def classify_image_with_claude(image_path, allowed_items):
    prompt = f"From this image, identify which one of the following items it is (if any): {allowed_items}. Only respond with one of the items from the list, or NULL if unsure or not in the list. If two items in the image, only respond with one item. Do not give me any response other than NULL or the name of the item."
    with open(image_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode("utf-8")

    response = client.messages.create(
        model="claude-3-7-sonnet-20250219",  
        max_tokens=1000,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": image_data}},
                {"type": "text", "text": prompt}
            ]
        }]
    )

    if (len(response.content[0].text) > 35):
        return "NULL"

    return response.content[0].text

def get_color(item):
    """Generate a consistent BGR color for an item string."""
    h = hashlib.md5(item.encode()).hexdigest()
    r = int(h[0:2], 16)
    g = int(h[2:4], 16)
    b = int(h[4:6], 16)
    return (b, g, r)  # OpenCV uses BGR

def update_label_and_draw(original_image_path, new_label, box, allowed_items, output_path):
    if new_label == "NULL":
        return (-1,-1,-1,-1) # Skip this box
    
    # Determine color based on label
    color = get_color(new_label if new_label in allowed_items else "other")
    
    # Read the image
    img = cv2.imread(output_path)
    
    # Convert box coordinates to integers
    xA, yA, xB, yB = map(int, box)
    
    # Draw rectangle
    cv2.rectangle(img, (xA, yA), (xB, yB), color, 2)
    
    # Add a background to the text for better readability
    text = new_label
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.6  # Slightly larger text
    thickness = 2     # Thicker text
    
    # Calculate text size and position
    (text_width, text_height), baseline = cv2.getTextSize(text, font, font_scale, thickness)
    text_x = xA
    text_y = max(yA - 10, text_height + 10)  # Ensure text doesn't go above image
    
    # Draw text background (slight padding around text)
    cv2.rectangle(img, 
                 (text_x - 2, text_y - text_height - 6), 
                 (text_x + text_width + 2, text_y + 2), 
                 color, -1)  # Filled rectangle
    
    # Draw text in contrasting color (white or black depending on background)
    # Simple calculation for contrasting text color
    text_color = (0, 0, 0) if sum(color) > 384 else (255, 255, 255)
    
    # Draw text
    cv2.putText(img, text, (text_x, text_y - 4), font, font_scale, text_color, thickness)
    
    # Save the output image
    cv2.imwrite(output_path, img)
    
    return (xA, yA, xB, yB)
    
def run_all(pred_image_name, crop_folder_name):
    d = {
        
    }

    pred_path = os.path.join(pred_folder, pred_image_name)
    name = os.path.splitext(pred_image_name)[0]
    output_path =  os.path.join(result_folder, pred_image_name)
    shutil.copy(pred_path, output_path)
    imgs_path = os.path.join(image_dir, crop_folder_name)
    res = make_prediction(crop_folder_name, pred_path)
    allowed_items = get_pantry_items_from_full_image(pred_path)
    cropped_images = get_all_image_files(imgs_path)
    j=0
    for i, img_path in enumerate(cropped_images):
        print(f"Processing: {img_path}")
        label = classify_image_with_claude(img_path, allowed_items)
        print(f" → Claude label: {label}")
        xA, yA, xB, yB = update_label_and_draw(pred_path, label, res[i], allowed_items, output_path)
        if (xA != -1):
            j+= 1
            d[j] = {
                "label": label,
                "box": [xA, yA, xB, yB]
            }
        
    print(d)
    return d



