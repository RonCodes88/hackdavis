import os
import io
import re
import json
import contextlib
from collections import Counter
from typing import Optional, Dict, List

from pydantic import BaseModel

from supabase import create_client, Client
from helper import load_env
import anthropic

from cerebras.cloud.sdk import Cerebras
from langchain_cerebras import ChatCerebras
from langchain_community.tools import DuckDuckGoSearchRun, DuckDuckGoSearchResults
from langchain_community.utilities import DuckDuckGoSearchAPIWrapper
from langchain.agents import initialize_agent, AgentExecutor, create_tool_calling_agent
from langchain.tools import Tool
from langchain_core.messages import SystemMessage, HumanMessage

anthropic_client = anthropic.Anthropic()
load_env()
client = Cerebras(api_key=os.environ.get("CEREBRAS_API_KEY"))
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

def ingredients_str_parser(ingredients_str: str):
    counted_ingredients = Counter([ingredient.lower().strip() for ingredient in ingredients_str.split(',')])
    lines = [f"{ingredient}: {count}" for ingredient, count in counted_ingredients.items()]
    return "\n".join(lines)

#print(ingredients_str_parser("Ichiban ramen noodles, dark chocolate peanut butter bar, whole grain pasta elbows, peanut butter, pasta sauce, white beans, Whole grain pasta elbows, chicken broth, ichiban ramen noodles"))


# def generate_recipe(resident_info: ResidentInfo, ingredients_str: str, meal_type: str = None, substitution_allowed: bool = False):
#     r_info_text = (
#     f"Name: {resident_info.name}, "
#     f"Age: {resident_info.age}, "
#     f"Medical Conditions: {resident_info.medicalConditions}, "
#     f"Medications: {resident_info.medications}, "
#     f"Food Allergies: {resident_info.foodAllergies}, "
#     f"Special Supportive Services: {resident_info.specialSupportiveServices}")




#     message = anthropic_client.messages.create(
#     model="claude-3-7-sonnet-20250219",
#     max_tokens=1500,
#     temperature=1,
#     system="""
#     Your important role is to generate healthy recipes for patients in a senior home. Each patient has unique dietary needs, which you must carefully follow. Ideally, recipes should be healthy, filling, and easy to prepare.

#     I will provide:
#     - Individual characteristics in the format: Characteristic: value (e.g., Diabetic: Yes, Dislikes: Garlic)
#     - Pantry contents in the format: 
#       "Item: Quantity" per line. For example:
#       Potato: 2  
#       Carrot: 1  
#       Egg: 3
#     - (Optional) A meal type such as “Breakfast” or “Snack”. If "None", assume it's for a standard meal.
#     - If substituions are allowed

#     You must:
#     - Only use ingredients from the pantry unless substitutions are explicitly allowed (Assume they at least have salt, pepper, and oil but no other seasonings unless stated). Write down if substitutions are used.
#     - Treat health conditions seriously if present (e.g., allergies or diseases)
#     - Prefer simple, low-effort recipes suited to caretakers
#     - Assume the recipe is for one person unless otherwise noted. If I specify this is for multiple individuals, generate a scalable recipe or note the portions.

#     Please format your response with the following sections:
#     1. Recipe Name
#     2. Ingredients List (with quantities)
#     3. Instructions
#     4. Notes (Explain how this recipe addresses the individual's needs)
#     """,
#     messages=[
#         {
#             "role": "user",
#             "content": [
#                 {
#                     "type": "text",
#                     "text": r_info_text + "\n" + ingredients_str_parser(ingredients_str) + "\nMeal Type:" + meal_type + "\nSubstitions Allowed:" + str(substitution_allowed)
#                 }
#             ]
#         }
#     ]
#     )
#     return message.content[0].text

#Replace above with below when we get the cerebras API
def generate_recipe(resident_info: ResidentInfo, ingredients_str: str, meal_type: str = None, substitution_allowed: bool = False):

    if (meal_type is None):
        meal_type = "N/A"

    r_info_text = (
    f"Name: {resident_info.name}, "
    f"Age: {resident_info.age}, "
    f"Medical Conditions: {resident_info.medicalConditions}, "
    f"Medications: {resident_info.medications}, "
    f"Food Allergies: {resident_info.foodAllergies}, "
    f"Special Supportive Services: {resident_info.specialSupportiveServices}")

    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": '''Your important role is to generate healthy recipes for patients in a senior home. Each patient has unique dietary needs, which you must carefully follow. Ideally, recipes should be healthy, filling, and easy to prepare.

                I will provide:
                - Individual characteristics in the format: Characteristic: value (e.g., Diabetic: Yes, Dislikes: Garlic)
                - Pantry contents in the format: 
                "Item: Quantity" per line. For example:
                Potato: 2  
                Carrot: 1  
                Egg: 3
                - (Optional) A meal type such as “Breakfast” or “Snack”. If "None", assume it's for a standard meal.
                - If substituions are allowed

                You must:
                - Only use ingredients from the pantry unless substitutions are explicitly allowed (Assume they at least have salt, pepper, and oil but no other seasonings unless stated). Write down if substitutions are used.
                - Treat health conditions seriously if present (e.g., allergies or diseases)
                - Prefer simple, low-effort recipes suited to caretakers
                - Assume the recipe is for one person unless otherwise noted. If I specify this is for multiple individuals, generate a scalable recipe or note the portions.

                Return a JSON and ONLY a JSON (No other text) in this format so that I can convert it to a python dictionary easily:

                recipe = {
                    "id": 2,
                    "name": "Low-Carb Pasta with Vegetables",
                    "prepTime": "20 minutes",
                    "servings": 1,
                    "ingredients": [
                        {"name": "pasta elbows (cooked)", "quantity": "1/2 cup"},
                        {"name": "pasta sauce", "quantity": "1/2 cup"},
                        {"name": "lettuce, chopped", "quantity": "1/2 cup"}
                    ],
                    "instructions": [
                        "Cook the pasta elbows according to package instructions until al dente. Drain and set aside.",
                        "Heat the pasta sauce in a pan over medium heat.",
                        "Add the chopped lettuce to the pasta sauce and simmer until the lettuce is wilted.",
                        "Combine the cooked pasta elbows with the pasta sauce and lettuce mixture.",
                        "Serve hot."
                    ],
                    "notes": {
                        "summary": "This recipe is designed to meet John's dietary needs while considering his medical conditions and food allergies.",
                        "benefits": [
                            {
                                "title": "Diabetes-friendly",
                                "description": "The portion of pasta is controlled to manage carbohydrate intake. Pasta sauce is a better choice than creamy sauces that might contain dairy or added sugars."
                            },
                            {
                                "title": "Low sodium",
                                "description": "The meal is low in sodium; if the pasta sauce contains high sodium, a low-sodium alternative is recommended."
                            },
                            {
                                "title": "Dairy-free",
                                "description": "This recipe avoids dairy products, making it safe for those with dairy allergies."
                            },
                            {
                                "title": "Supports glucose management",
                                "description": "Though it doesn’t affect insulin directly, controlling carbohydrate intake helps with blood glucose management, especially for someone on Metformin."
                            }
                        ]
                    }
                }

                '''
            },
            {
                "role": "user",
                "content": r_info_text + "\n" + ingredients_str_parser(ingredients_str) + "\nMeal Type:" + meal_type + "\nSubstitions Allowed:" + str(substitution_allowed)
            }
        ],
        temperature = 1.0,
        max_tokens = 1500,
        model= 'llama-3.3-70b'
    )
    return chat_completion.choices[0].message.content
   
def extract_json_from_text(text: str) -> str:
    start = text.find('{')
    end = text.rfind('}') + 1

    if start == -1 or end == -1 or end <= start:
        raise ValueError("No valid JSON object found")

    return text[start:end]

def get_dict(resident_info: ResidentInfo, ingredients_str: str, meal_type: str = None, substitution_allowed: bool = False):
    recipe = generate_recipe(resident_info, ingredients_str)
    cleaned_string = extract_json_from_text(recipe)
    recipe_dict = json.loads(cleaned_string)
    return recipe_dict


def text_to_dict(text: str) -> dict:
    start = text.find('{')
    end = text.rfind('}') + 1

    if start == -1 or end == -1 or end <= start:
        raise ValueError("No valid JSON object found")

    return json.loads(text[start:end])
