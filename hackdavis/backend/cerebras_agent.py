import os
from cerebras.cloud.sdk import Cerebras

# Initialize Cerebras client
cerebras_client = Cerebras(
    api_key=os.environ.get("CEREBRAS_API_KEY"),
)

def create_caretaker_profile(resident_info):
    """
    Creates a unique identifier for a caretaker agent for a resident.
    
    Args:
        resident_info (dict): Information about the resident.
    
    Returns:
        dict: The created caretaker agent information.
    """
    # Generate a unique ID for this caretaker
    agent_id = f"cerebras_agent_{resident_info['name'].lower().replace(' ', '_')}"
    
    # Create caretaker information
    return {
        "id": agent_id,
        "name": f"Caretaker for {resident_info['name']}"
    }

def get_agent_response(agent_id, user_message, resident_info=None):
    """
    Get a response from the Cerebras AI acting as a caretaker.
    
    Args:
        agent_id (str): The ID of the agent.
        user_message (str): The message from the user.
        resident_info (dict, optional): Information about the resident.
    
    Returns:
        str: The AI's response.
    """
    # Create system message with context about the resident
    system_message = "You are a compassionate and attentive caretaker assistant for a senior living facility."
    
    if resident_info:
        system_message += f" You are currently assisting with {resident_info['name']}."
        if resident_info.get('age'):
            system_message += f" The resident is {resident_info['age']} years old."
        if resident_info.get('medical_conditions'):
            system_message += f" They have the following medical conditions: {resident_info['medical_conditions']}."
        if resident_info.get('medications'):
            system_message += f" Their medications include: {resident_info['medications']}."
        if resident_info.get('food_allergies'):
            system_message += f" They have food allergies to: {resident_info['food_allergies']}."
        if resident_info.get('special_supportive_services'):
            system_message += f" They require these special services: {resident_info['special_supportive_services']}."
    
    # Create messages for the conversation
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": user_message}
    ]
    
    # Get response from Cerebras
    try:
        response = cerebras_client.chat.completions.create(
            model="llama-4-scout-17b-16e-instruct",  
            messages=messages,
        )
        
        # Extract and return the content
        if response.choices and len(response.choices) > 0:
            return response.choices[0].message.content
        else:
            return "No response from caretaker agent"
            
    except Exception as e:
        print(f"Error communicating with Cerebras: {e}")
        return f"Error: {str(e)}"