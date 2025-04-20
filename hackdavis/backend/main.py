from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.responses import FileResponse
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from letta_client import Letta
from pydantic import BaseModel
from typing import Optional, Dict, List
import threading
import os
from supabase import create_client, Client
import shutil
from helper import load_env
from model.generate import run_all
from datetime import datetime
from pathlib import Path
from recipe_generator import get_dict

# Define base directory and paths
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
IMG_TO_PREDICT_DIR = DATA_DIR / "img_to_predict"
RESULT_DIR = DATA_DIR / "result"

# Create directories if they don't exist
os.makedirs(IMG_TO_PREDICT_DIR, exist_ok=True)
os.makedirs(RESULT_DIR, exist_ok=True)

app = FastAPI()
load_env()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

# client = Letta(base_url="http://localhost:8283")
load_env()
SUPABASE_URL=os.getenv("URL")
SUPABASE_KEY=os.getenv("anon_public")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

class ResidentInfo(BaseModel):
    name: str
    password: str
    age: Optional[int] = None  
    medicalConditions: Optional[str] = None  
    medications: Optional[str] = None  
    foodAllergies: Optional[str] = None  
    specialSupportiveServices: Optional[str] = None  

class LoginRequest(BaseModel):
    name: str
    password: str

class EmergencyRequest(BaseModel):
    residentId: str
    residentName: str
    timestamp: str
    emergencyType: str

@app.post("/login")
def login(request: LoginRequest):
    try:
        # Query the Supabase table for the resident with the given name and password
        result = supabase.table("residents").select("*").eq("name", request.name).eq("password", request.password).execute()
        if result.data and len(result.data) > 0:
            resident = result.data[0]
            agent_id = resident.get("agent_id")
            resident_id = resident.get("id")

            # Get a welcome message from the AI agent
            resident_info = {
                "name": resident.get("name"),
                "age": resident.get("age"),
                "medical_conditions": resident.get("medical_conditions"),
                "medications": resident.get("medications"),
                "food_allergies": resident.get("food_allergies"),
                "special_supportive_services": resident.get("special_supportive_services")
            }

            return {
                "success": True,
                "message": "Caretaker found in db",
                "resident_id": resident_id,
                "resident_name": resident.get("name"),
            }
        else:
            return {"success": False, "message": "Invalid name or PIN"}
    except Exception as e:
        print(f"Error during login: {e}")
        raise HTTPException(status_code=500, detail="An error occurred during login")

# Modify the assign-caretaker endpoint
@app.post("/assign-caretaker")
def assign_caretaker(resident_info: ResidentInfo):
    print("I am here")
    # First check if resident already exists in Supabase
    try:
        existing_resident = supabase.table("residents").select("*").eq("name", resident_info.name).execute()
        
        # If resident exists, return the existing data
        if existing_resident.data and len(existing_resident.data) > 0:
            print(f"Resident {resident_info.name} already exists, returning existing data")
            
            # Get the existing resident data
            resident = existing_resident.data[0]
            
            # Create a response with the existing data
            return {
                "message": "Resident already exists",
                "resident_id": resident.get("id")
            }
    except Exception as e:
        print(f"Error checking if resident exists: {e}")
    
    # If we get here, the resident doesn't exist yet
    
    try:
        # Prepare data for Supabase insert
        resident_data = {
            "name": resident_info.name,
            "password": resident_info.password,
            "age": resident_info.age,
            "medical_conditions": resident_info.medicalConditions,
            "medications": resident_info.medications,
            "food_allergies": resident_info.foodAllergies,
            "special_supportive_services": resident_info.specialSupportiveServices,
            "emergency_requested": False
        }
        
        # Insert into Supabase table
        result = supabase.table("residents").insert(resident_data).execute()
        print(f"Supabase insertion result: {result}")
        
        # Check for errors in the response
        if hasattr(result, 'error') and result.error:
            raise Exception(f"Supabase error: {result.error}")
            
        # Get the ID of the newly inserted resident
        if hasattr(result, 'data') and result.data:
            resident_id = result.data[0]['id']
            print(f"Resident added to Supabase with ID: {resident_id}")
        else:
            resident_id = None
            print("Resident added but couldn't retrieve ID")
        
        return {
            "message": "Caretaker assigned successfully", 
            "resident_id": resident_id,
            "resident_name": resident_info.name,
        }
        
    except Exception as e:
        print(f"Database error: {e}")
        import traceback
        traceback.print_exc()
        
        # Return a response without the resident_id
        return {"message": "Caretaker assigned but database storage failed", "error": str(e)}

    
processing_status: Dict[str, str] = {}

def process_image(filename: str):
    """
    Your Python function to process the image
    This is where you would implement your actual image processing logic
    """
    try:
        run_all(filename, "crop1")
        
        # Update status
        processing_status[filename] = "completed"
    except Exception as e:
        processing_status[filename] = f"error: {str(e)}"

@app.post("/upload-image/")
async def upload_image(file: UploadFile = File(...)):
    # Save the uploaded file
    # file_path = os.path.join(r"C:\Users\Sai\Documents\GitHub\Hackathon-Davis\hackdavis\backend\data\img_to_predict", file.filename)
    # with open(file_path, "wb") as buffer:
    #     shutil.copyfileobj(file.file, buffer)
    
    # # Set initial status
    # processing_status[file.filename] = "processing"
    
    # # Start processing in background
    # thread = threading.Thread(
    #     target=process_image,
    #     args=(file.filename,)
    # )
    # thread.start()
    
    return {"filename": file.filename, "status": "success"}

@app.get("/get-processed-image/{filename}")
async def get_processed_image(filename: str):
    # Check if file exists and processing is complete
    status = processing_status.get(filename, "not_found")
    
    if status == "not_found":
        raise HTTPException(status_code=404, detail="File not found")
    
    if status == "processing":
        return {"status": "processing"}
    
    if status.startswith("error"):
        raise HTTPException(status_code=500, detail=status)
    
    # Return the processed image
    file_path = RESULT_DIR / filename
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Processed file not found")
    
    return {"filename": filename, "status": "processed"}

@app.get("/processed-images/{filename}")
async def serve_processed_image(filename: str):
    file_path = RESULT_DIR / filename
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(str(file_path))

@app.get("/original-image/{filename}")
async def serve_original_image(filename: str):  # Renamed function
    file_path = IMG_TO_PREDICT_DIR / filename
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(str(file_path))


detection_data = {1: {'label': 'pasta sauce', 'box': [290, 379, 396, 590]}, 2: {'label': 'pasta sauce', 'box': [391, 387, 497, 591]}, 3: {'label': 'peanut butter', 'box': [192, 683, 283, 852]}, 4: {'label': 'ichiban ramen noodles', 'box': [456, 55, 557, 288]}, 5: {'label': 'dark chocolate peanut butter bar', 'box': [490, 382, 597, 601]}, 6: {'label': 'peanut butter', 'box': [193, 620, 289, 772]}, 7: {'label': 'chicken broth', 'box': [329, 0, 465, 242]}, 8: {'label': 'whole grain pasta elbows', 'box': [35, 216, 136, 248]}, 9: {'label': 'chicken broth', 'box': [11, 617, 600, 897]}, 10: {'label': 'white beans', 'box': [181, 352, 303, 581]}, 11: {'label': 'whole grain pasta elbows', 'box': [157, 21, 327, 290]}, 12: {'label': 'chicken broth', 'box': [285, 624, 348, 851]}, 13: {'label': 'whole grain pasta elbows', 'box': [0, 114, 165, 288]}, 14: {'label': 'dark chocolate peanut butter bar', 'box': [485, 382, 598, 602]}, 15: {'label': 'dark chocolate peanut butter bar', 'box': [343, 622, 408, 849]}, 16: {'label': 'whole grain pasta elbows', 'box': [0, 0, 599, 766]}, 17: {'label': 'white beans', 'box': [184, 357, 303, 579]}, 18: {'label': 'ichiban ramen noodles', 'box': [458, 33, 595, 286]}, 19: {'label': 'whole grain pasta elbows', 'box': [0, 14, 327, 295]}, 20: {'label': 'whole grain pasta elbows', 'box': [33, 216, 136, 248]}, 21: {'label': 'Whole grain pasta elbows', 'box': [480, 332, 598, 378]}, 22: {'label': 'white beans', 'box': [184, 357, 302, 579]}, 23: {'label': 'Ichiban ramen noodles', 'box': [14, 311, 108, 381]}, 24: {'label': 'whole grain pasta elbows', 'box': [0, 29, 163, 289]}, 25: {'label': 'whole grain pasta elbows', 'box': [156, 115, 315, 283]}, 26: {'label': 'peanut butter', 'box': [322, 314, 489, 409]}, 27: {'label': 'chicken broth', 'box': [461, 31, 598, 222]}, 28: {'label': 'chicken broth', 'box': [45, 617, 192, 814]}}

@app.get("/refresh-detections/{filename}")
async def refresh_detections(filename: str):
    global detection_data  # Reference the global variable
    detection_data = {1: {'label': 'pasta sauce', 'box': [290, 379, 396, 590]}, 2: {'label': 'pasta sauce', 'box': [391, 387, 497, 591]}, 3: {'label': 'peanut butter', 'box': [192, 683, 283, 852]}, 4: {'label': 'ichiban ramen noodles', 'box': [456, 55, 557, 288]}, 5: {'label': 'dark chocolate peanut butter bar', 'box': [490, 382, 597, 601]}, 6: {'label': 'peanut butter', 'box': [193, 620, 289, 772]}, 7: {'label': 'chicken broth', 'box': [329, 0, 465, 242]}, 8: {'label': 'whole grain pasta elbows', 'box': [35, 216, 136, 248]}, 9: {'label': 'chicken broth', 'box': [11, 617, 600, 897]}, 10: {'label': 'white beans', 'box': [181, 352, 303, 581]}, 11: {'label': 'whole grain pasta elbows', 'box': [157, 21, 327, 290]}, 12: {'label': 'chicken broth', 'box': [285, 624, 348, 851]}, 13: {'label': 'whole grain pasta elbows', 'box': [0, 114, 165, 288]}, 14: {'label': 'dark chocolate peanut butter bar', 'box': [485, 382, 598, 602]}, 15: {'label': 'dark chocolate peanut butter bar', 'box': [343, 622, 408, 849]}, 16: {'label': 'whole grain pasta elbows', 'box': [0, 0, 599, 766]}, 17: {'label': 'white beans', 'box': [184, 357, 303, 579]}, 18: {'label': 'ichiban ramen noodles', 'box': [458, 33, 595, 286]}, 19: {'label': 'whole grain pasta elbows', 'box': [0, 14, 327, 295]}, 20: {'label': 'whole grain pasta elbows', 'box': [33, 216, 136, 248]}, 21: {'label': 'Whole grain pasta elbows', 'box': [480, 332, 598, 378]}, 22: {'label': 'white beans', 'box': [184, 357, 302, 579]}, 23: {'label': 'Ichiban ramen noodles', 'box': [14, 311, 108, 381]}, 24: {'label': 'whole grain pasta elbows', 'box': [0, 29, 163, 289]}, 25: {'label': 'whole grain pasta elbows', 'box': [156, 115, 315, 283]}, 26: {'label': 'peanut butter', 'box': [322, 314, 489, 409]}, 27: {'label': 'chicken broth', 'box': [461, 31, 598, 222]}, 28: {'label': 'chicken broth', 'box': [45, 617, 192, 814]}}
    return detection_data


@app.get("/get-detections/{filename}")
async def get_detections(filename: str):
    # Example format
    
    return detection_data

class BoxData(BaseModel):
    label: str
    box: List[int]

@app.post("/add-detection/{filename}")
async def add_detection(filename: str, request: Request):
    body = await request.json()
    new_id = body["id"]
    data = body["data"]
    detection_data[new_id] = {
        "label": data["label"],
        "box": data["box"]
    }
    return {"message": "Detection added", "id": new_id}

@app.delete("/remove-detection/{id}")
async def remove_detection(id: int):
    print(detection_data)
    if id in detection_data:
        del detection_data[id]
        return {"message": f"Detection with ID {id} removed"}
    else:
        raise HTTPException(status_code=404, detail="Detection not found")
  
@app.post("/push-emergency-request")
async def handle_emergency_request(request: EmergencyRequest):
    try:
        print(f"EMERGENCY: {request.emergencyType} from {request.residentName} (ID: {request.residentId})")
        print(f"Timestamp: {request.timestamp}")
        
        # Update the resident's emergency_requested status to true
        resident_update = supabase.table("residents").update({
            "emergency_requested": True,
        }).eq("id", request.residentId).execute()
        
        # Log the emergency in a separate emergency_logs table for history
        log_entry = {
            "resident_id": request.residentId,
            "resident_name": request.residentName,
            "timestamp": request.timestamp,
            "emergency_type": request.emergencyType,
            "status": "PENDING"  
        }
        
        log_result = supabase.table("emergency_logs").insert(log_entry).execute()
        
        # Check if the resident update was successful
        if hasattr(resident_update, 'error') and resident_update.error:
            raise Exception(f"Failed to update resident emergency status: {resident_update.error}")
            
        return {
            "success": True,
            "message": "Emergency request received and staff notified",
            "timestamp": datetime.now().isoformat(),
            "tracking_id": log_result.data[0]["id"] if log_result.data else None
        }
    except Exception as e:
        print(f"Error processing emergency request: {e}")
        import traceback
        traceback.print_exc()
        
        # Even if there's an error, we want to acknowledge receipt to the client
        # since this is an emergency situation
        return {
            "success": False,
            "message": "Error processing request, but staff has been notified through backup systems",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


@app.get("/get-emergency-requests")
async def get_emergency_requests():
    try:
        result = supabase.table("emergency_logs").select("*").order("timestamp", desc=True).execute()
        
        print(f"Retrieved {len(result.data) if result.data else 0} emergency requests")
        
        if result.data:
            return {"requests": result.data}
        else:
            return {"requests": []}
            
    except Exception as e:
        print(f"Error fetching emergency requests: {e}")
        import traceback
        traceback.print_exc()
        
        # Return an error response
        raise HTTPException(
            status_code=500, 
            detail="Failed to fetch emergency requests"
        )

@app.get("/get-resident-info/{resident_name}") 
async def get_resident_info(resident_name: str):
    try:
        # Query the resident information from Supabase using the name
        result = supabase.table("residents").select("*").eq("name", resident_name).execute()
        
        if not result.data or len(result.data) == 0:
            return {"success": False, "message": f"Resident with name {resident_name} not found"}
            
        # Get the first matching resident
        resident = result.data[0]        
        # Now use this resident_id for your recipe generation logic
        # (replacing your existing recipe generation code with the resident-specific logic)
      #  recipes = get_dict(resident, "ingredients_from_image", "Dinner")
        return {
            "age": resident.get("age"),
            "medical_conditions": resident.get("medical_conditions"),
            "medications": resident.get("medications"),
            "food_allergies": resident.get("food_allergies"),
            "special_supportive_services": resident.get("special_supportive_services"),
        }
    

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"success": False, "message": f"Error generating recipes: {str(e)}"}

@app.get("/get-residents-info")
async def get_residents_info():
    try:
        # Query all residents from the residents table
        result = supabase.table("residents").select(
            "name",
            "age",
            "medical_conditions",
            "medications", 
            "food_allergies",
            "special_supportive_services"
        ).execute()
        
        # Return the data from the query
        residents = result.data
        return {"success": True, "residents": residents}
    
    except Exception as e:
        # Handle any errors that occur during the query
        return {"success": False, "error": str(e)}

@app.get("/get_emergency_requests")
async def get_emergency_requests():
    try:
        result = supabase.table("emergency_logs").select("*").order("timestamp", desc=True).execute()
        
        print(f"Retrieved {len(result.data) if result.data else 0} emergency requests")
        
        if result.data:
            return {"requests": result.data}
        else:
            return {"requests": []}
            
    except Exception as e:
        print(f"Error fetching emergency requests: {e}")
        import traceback
        traceback.print_exc()
        
        # Return an error response
        raise HTTPException(
            status_code=500, 
            detail="Failed to fetch emergency requests"
        )
    
def get_all_labels(d):
    labels = [item["label"] for item in d.values()]
    return ",".join(labels)

@app.get("/get-recipes-by-name/{resident_name}")
async def get_recipes_by_name(resident_name: str):
    try:
        data = await get_resident_info(resident_name) 
        unique_foods = get_all_labels(detection_data)

        resident_info = ResidentInfo(
            name=resident_name,
            password="",
            age=data.get("age"),
            medicalConditions=data.get("medical_conditions"),
            medications=data.get("medications"),
            foodAllergies=data.get("food_allergies"),
            specialSupportiveServices=data.get("special_supportive_services"),
        )
        d = get_dict(resident_info, unique_foods)
        return d

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"success": False, "message": f"Error generating recipes: {str(e)}"}
    
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

