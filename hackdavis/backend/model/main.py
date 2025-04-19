import os
from dotenv import load_dotenv
from generate import run_all
from generate import get_all_pantry_items_from_full_image
run_all("How-to-Stock-your-Pantry-2.jpg", "l")


#print(get_all_pantry_items_from_full_image(r"C:\Users\Sai\Desktop\hackdavis\hackdavis\backend\data\img_to_predict\How-to-Stock-your-Pantry-2.jpg"))