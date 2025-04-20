from pydantic import BaseModel
from typing import Optional
import os
from supabase import create_client, Client
from helper import load_env
import anthropic
from collections import Counter
from cerebras.cloud.sdk import Cerebras
from langchain_cerebras import ChatCerebras
from langchain_community.tools import DuckDuckGoSearchRun, DuckDuckGoSearchResults
from langchain_community.utilities import DuckDuckGoSearchAPIWrapper
from langchain.agents import initialize_agent
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain.tools import Tool
import io
import re
import contextlib
from langchain_core.messages import SystemMessage, HumanMessage

anthropic_client = anthropic.Anthropic()
load_env()
client = Cerebras(api_key=os.environ.get("CEREBRAS_API_KEY"))
SUPABASE_URL=os.getenv("URL")
SUPABASE_KEY=os.getenv("anon_public")
LANGCHAIN_API_KEY = os.getenv("LANGCHAIN_API_KEY")
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = LANGCHAIN_API_KEY

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) 
llm = ChatCerebras(model='llama-4-scout-17b-16e-instruct', api_key=os.environ.get("CEREBRAS_API_KEY"), temperature=1.0, max_tokens=1500)
search = DuckDuckGoSearchRun(description='A wrapper around DuckDuckGo Search. Useful for to help come up for ideas for recipes. Input should be a search query. Look through a multitude of websites and focus on the ingredients the recipe needs,ease of preparation, and rating. Look through at least 20 websites before coming to your conclusion')
duckduckgo = Tool(name = 'DuckDuckGo Search', func = lambda query: search.run(query), description="Useful for searching the web for recipes")
tools = [duckduckgo]

# prompt = ChatPromptTemplate.from_messages(
#     [
#         (
#              "system",
#                '''Your important role is to generate healthy recipes for patients in a senior home. Each patient has unique dietary needs, which you must carefully follow. Ideally, recipes should be healthy, filling, and easy to prepare. Use DuckDuckGo tool to look up recipes.

#                 I will provide:
#                 - Individual characteristics in the format: Characteristic: value (e.g., Diabetic: Yes, Dislikes: Garlic)
#                 - Pantry contents in the format: 
#                 "Item: Quantity" per line. For example:
#                 Potato: 2  
#                 Carrot: 1  
#                 Egg: 3
#                 - (Optional) A meal type such as “Breakfast” or “Snack”. If "None", assume it's for a standard meal.
#                 - If substituions are allowed

#                 You must:
#                 - Only use ingredients from the pantry unless substitutions are explicitly allowed (Assume they at least have salt, pepper, and oil but no other seasonings unless stated). Write down if substitutions are used.
#                 - Treat health conditions seriously if present (e.g., allergies or diseases)
#                 - Prefer simple, low-effort recipes suited to caretakers
#                 - Assume the recipe is for one person unless otherwise noted. If I specify this is for multiple individuals, generate a scalable recipe or note the portions.

#                 Please format your response with the following sections:
#                 1. Recipe Name
#                 2. Ingredients List (with quantities)
#                 3. Instructions
#                 4. Notes (Explain how this recipe addresses the individual's needs)
#                 ''',
#         ),
#         ("placeholder", "{chat_history}"),
#         ("human", "{input}"),
#         ("placeholder", "{agent_scratchpad}"),
#     ]
# )


agent = initialize_agent(tools, llm, agent='zero-shot-react-description', verbose= True)


# agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

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
    r_info_text = (
    f"Name: {resident_info.name}, "
    f"Age: {resident_info.age}, "
    f"Medical Conditions: {resident_info.medicalConditions}, "
    f"Medications: {resident_info.medications}, "
    f"Food Allergies: {resident_info.foodAllergies}, "
    f"Special Supportive Services: {resident_info.specialSupportiveServices}")

    human_msg = r_info_text + "\n" + ingredients_str_parser(ingredients_str) + "\nMeal Type:" + meal_type + "\nSubstitions Allowed:" + str(substitution_allowed)

    messages = [
    SystemMessage(content='''Your important role is to generate healthy recipes for patients in a senior home. Each patient has unique dietary needs, which you must carefully follow. Ideally, recipes should be healthy, filling, and easy to prepare.

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

                Please format your response with the following sections:
                1. Recipe Name
                2. Ingredients List (with quantities)
                3. Instructions
                4. Notes (Explain how this recipe addresses the individual's needs)
                '''),
    HumanMessage(content=human_msg),
    ]

    output_buffer = io.StringIO()
    with contextlib.redirect_stdout(output_buffer):
        result = agent.invoke(messages)

    verbose_output = output_buffer.getvalue()
    ansi_escape = re.compile(r'\x1B\[[0-?]*[ -/]*[@-~]')
    verbose_output = ansi_escape.sub('', verbose_output)
    print("\n--- Step-by-Step Reasoning ---\n")
    for line in verbose_output.splitlines():
        if "Thought:" in line:
            print(f"[Thought] {line.replace('Thought:', '').strip()}")
        elif "Action:" in line:
            print(f"[Action] {line.replace('Action:', '').strip()}")
        elif "Action Input:" in line:
            print(f"[Input] {line.replace('Action Input:', '').strip()}")
        elif "Observation:" in line:
            print(f"[Observation] {line.replace('Observation:', '').strip()}")
        elif "Final Answer:" in line:
            print(f"\n[Answer] {line.replace('Final Answer:', '').strip()}")
    print("\n=== Final Answer ===")

    return result["output"]

    # agent_executor.invoke({"input": r_info_text + "\n" + ingredients_str_parser(ingredients_str) + "\nMeal Type:" + meal_type + "\nSubstitions Allowed:" + str(substitution_allowed)})

