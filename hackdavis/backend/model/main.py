import os
from dotenv import load_dotenv
from generate import run_all
from generate import get_all_pantry_items_from_full_image, get_all_labels
import json

#run_all("How-to-Stock-your-Pantry-2.jpg", "l")

d = {'id': 1, 'name': 'Low-Sodium, Diabetes-Friendly Pasta with White Beans', 'prepTime': '15 minutes', 'servings': 1, 'ingredients': [{'name': 'whole grain pasta elbows', 'quantity': '1/2 cup'}, {'name': 'white beans', 'quantity': '1/2 cup'}, {'name': 'chicken broth', 'quantity': '1/4 cup'}], 'instructions': ['Cook the whole grain pasta elbows according to package instructions until al dente. Drain and set aside.', 'Heat the chicken broth in a pan over low heat.', 'Add the white beans to the chicken broth and simmer for 2-3 minutes.', 'Combine the cooked pasta elbows with the white bean and broth mixture.', 'Serve hot.'], 'notes': {'summary': "This recipe is designed to meet Jerold's dietary needs while considering his medical conditions and food allergies.", 'benefits': [{'title': 'Low sodium', 'description': 'The use of chicken broth and avoidance of high-sodium ingredients help manage sodium intake, which is crucial for someone with hypertension.'}, {'title': 'Diabetes-friendly', 'description': 'The portion of pasta is controlled, and white beans provide a good source of fiber and protein, which can help manage blood sugar levels.'}, {'title': 'Dairy-free', 'description': 'This recipe avoids dairy products, making it safe for those with dairy allergies.'}, {'title': 'Supports joint health', 'description': 'The fiber and antioxidants in whole grain pasta and white beans may help reduce inflammation, which can be beneficial for someone with osteoarthritis.'}]}}
print(json.loads(d))
