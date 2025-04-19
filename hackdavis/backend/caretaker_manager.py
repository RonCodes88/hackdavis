from letta_client import Letta
# create a client to connect to your local Letta Server
client = Letta(
  base_url="http://localhost:8283"
)

org_description = """
The senior home company foresees many senior adults who need specialized care.
We utilize AI agents that serve as assistants for caretakers and senior homes' catering units.
"""
shared_block = client.blocks.create(label="Senior Home Company", value=org_description)

manager_persona = """
You are a manager of a senior home. You are responsible for assigning each senior to a new caretaker agent, ensure that each agent is only assigned to one senior.
"""
# Function to get or create the Caretakers Manager Agent
def get_or_create_manager_agent():
    """
    Ensures that the Caretakers Manager Agent is created only once.
    Returns:
        dict: The existing or newly created manager agent.
    """
    existing_agents = client.agents.list(name="Caretakers Manager Agent")
    if existing_agents:
        print("Manager Agent already exists:", existing_agents[0])
        return existing_agents[0]  

    manager_persona = """
    You are a manager of a senior home. You are responsible for assigning each senior to a new caretaker agent, ensuring that each agent is only assigned to one senior.
    """
    manager_agent = client.agents.create(
        name="Caretakers Manager Agent",
        memory_blocks=[
            {
                "label": "manager_persona",
                "value": manager_persona
            },
        ],
        model="anthropic/claude-3-5-haiku-20241022",
        context_window_limit=16000,
        embedding="openai/text-embedding-3-small",
        block_ids=[shared_block.id]
    )
    print("Manager Agent created:", manager_agent)
    return manager_agent

manager = get_or_create_manager_agent()

def create_caretaker_agent(resident_info, identity_id):
    """
    Creates a new caretaker agent for a resident.
    Args:
        resident_info (dict): Information about the resident.
        identity_id (str): The identity ID associated with the resident.
    Returns:
        dict: The created caretaker agent.
    """
    caretaker_agent = client.agents.create(
        name=f"Caretaker for {resident_info['name']}",
        memory_blocks=[
            {
                "label": "resident_info",
                "value": f"You are a friendly and caring caretaker for a senior home resident. You are determined to provide a better quality of life for the resident. "
                         f"Here is their information: "
                         f"Name: {resident_info['name']}, "
                         f"Age: {resident_info['age']}, "
                         f"Medical Conditions: {resident_info['medicalConditions']}, "
                         f"Medications: {resident_info['medications']}, "
                         f"Food Allergies: {resident_info['foodAllergies']}, "
                         f"Special Supportive Services: {resident_info['specialSupportiveServices']}"
            }
        ],
        model="anthropic/claude-3-5-haiku-20241022",
        context_window_limit=16000,
        embedding="openai/text-embedding-3-small",
        identity_ids=[identity_id]
    )
    return caretaker_agent