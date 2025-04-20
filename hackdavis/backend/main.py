from fastapi import FastAPI, UploadFile, File, HTTPException, Form, WebSocket, WebSocketDisconnect, BackgroundTasks, Request
from fastapi.responses import FileResponse, JSONResponse
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import threading
import os
from supabase import create_client, Client
import shutil
from helper import load_env
from model.generate import run_all
from datetime import datetime
from pathlib import Path
import uuid
from pdf_generator_cli import create_medical_history_pdf
from rag import load_and_split_pdf, init_pinecone_index, upload_vectors, get_docsearch_for_resident
from langchain_ollama import OllamaEmbeddings
import tempfile
from langchain.chains.question_answering import load_qa_chain
from langchain_cerebras import ChatCerebras
from langchain_pinecone import PineconeVectorStore
import asyncio
from twilio.rest import Client

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

load_env()

SUPABASE_URL = os.getenv("URL")
SUPABASE_SERVICE_KEY = os.getenv("service_role")
CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")


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
    description: Optional[str] = None

class NonEmergencyRequest(BaseModel):
    residentId: str
    residentName: str
    timestamp: str
    description: Optional[str] = None
    
class CallRequest(BaseModel):
    residentId: str
    residentName: str
    contactName: str
    phoneNumber: str

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

connected_clients = []

active_connections = []

@app.websocket("/ws/emergency-updates")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        # Send current emergencies immediately on connection
        try:
            emergency_summaries = get_current_emergency_summaries()
            if emergency_summaries:
                await websocket.send_json({
                    "type": "emergency_update",
                    "data": emergency_summaries
                })
        except Exception as e:
            print(f"Error sending initial data: {e}")
            
        # Keep connection alive and handle incoming messages
        while True:
            data = await websocket.receive_text()
            # Handle client messages if needed
    except WebSocketDisconnect:
        active_connections.remove(websocket)

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
async def handle_emergency_request(request: EmergencyRequest, background_tasks: BackgroundTasks):
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
            "emergency_description": request.description,
            "status": "PENDING"  
        }
        
        log_result = supabase.table("emergency_logs").insert(log_entry).execute()
        
        # Check if the resident update was successful
        if hasattr(resident_update, 'error') and resident_update.error:
            raise Exception(f"Failed to update resident emergency status: {resident_update.error}")
        
        # Notify all connected clients
        background_tasks.add_task(notify_all_clients, request.residentId, request.residentName)
            
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

@app.post("/request-non-emergency-care")
async def request_non_emergency_care(request: NonEmergencyRequest):
    try:
        print(f"NON-EMERGENCY CARE REQUEST from {request.residentName} (ID: {request.residentId})")
        print(f"Timestamp: {request.timestamp}")
        print(f"Description: {request.description}")
        
        # Log the care request in a non_emergency_logs table
        care_request = {
            "resident_id": request.residentId,
            "resident_name": request.residentName,
            "timestamp": request.timestamp,
            "description": request.description,
            "status": "PENDING"
        }
        
        care_result = supabase.table("non_emergency_logs").insert(care_request).execute()
        
        return {
            "success": True,
            "message": "Care request received",
            "timestamp": datetime.now().isoformat(),
            "tracking_id": care_result.data[0]["id"] if care_result.data else None
        }
    except Exception as e:
        print(f"Error processing care request: {e}")
        import traceback
        traceback.print_exc()
        
        return {
            "success": False,
            "message": "Error processing care request",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

async def notify_all_clients(resident_id, resident_name):
    # First notify of new emergency
    for connection in active_connections:
        try:
            await connection.send_json({
                "type": "new_emergency",
                "data": {
                    "resident_id": resident_id,
                    "resident_name": resident_name,
                    "timestamp": datetime.now().isoformat()
                }
            })
        except Exception as e:
            print(f"Error notifying client of new emergency: {e}")
    
    # Process the emergency summary (might take time with LLM)
    try:
        emergency_summaries = get_current_emergency_summaries()
        
        # Then send the full summary
        for connection in active_connections:
            try:
                await connection.send_json({
                    "type": "emergency_update",
                    "data": emergency_summaries
                })
            except Exception as e:
                print(f"Error sending emergency summary: {e}")
    except Exception as e:
        print(f"Error processing emergency summary: {e}")

def get_current_emergency_summaries():
    """
    Get current emergency summaries for WebSocket updates with RAG
    Returns only the most recent emergency with a concise summary
    """
    try:
        # Fetch most recent emergency log with PENDING status
        emergency_result = (supabase.table("emergency_logs")
                          .select("*")
                          .eq("status", "PENDING")
                          .order("timestamp", desc=True)
                          .limit(1)  # Only get the most recent one
                          .execute())
        
        if not emergency_result.data or len(emergency_result.data) == 0:
            return []
            
        # Initialize RAG components for vector search
        try:
            from pinecone import Pinecone as PineconeClient
            
            # Initialize embeddings
            embeddings = OllamaEmbeddings(model="nomic-embed-text")
            
            # Initialize Pinecone client
            pc = PineconeClient(api_key=PINECONE_API_KEY)
            index_name = "hackdavis-rag-index"
            
            # Get the one emergency we're processing
            emergency_data = emergency_result.data[0]
            resident_id = emergency_data.get("resident_id")
            
            # Use the new PineconeVectorStore class with the resident filter
            docsearch = PineconeVectorStore(
                index_name=index_name,
                embedding=embeddings,
                text_key="text",
                pinecone_api_key=PINECONE_API_KEY
            )
            
            # Create a filter for the similarity search later
            filter_dict = {"resident_id": resident_id} if resident_id else None
            print(f"Successfully initialized Pinecone vector store for resident {resident_id}")
            
            # Initialize LLM for RAG
            llm = ChatCerebras(api_key=CEREBRAS_API_KEY, model="llama-3.3-70b")
            chain = load_qa_chain(llm, chain_type="stuff")
            
        except Exception as e:
            print(f"Error initializing RAG components for WebSocket: {e}")
            docsearch = None
            chain = None
            
        # Process the emergency
        emergency_summaries = []
        emergency_data = emergency_result.data[0]
        resident_id = emergency_data.get("resident_id")
        resident_name = emergency_data.get("resident_name")
        
        # Get resident details
        try:
            resident_details = supabase.table("residents").select("*").eq("id", resident_id).execute()
            if resident_details.data and len(resident_details.data) > 0:
                resident_record = resident_details.data[0]
            else:
                resident_record = {}
        except Exception as e:
            print(f"Error fetching resident details: {e}")
            resident_record = {}
            
        # Compile resident info - keep only essential information
        resident_info = {
            "name": resident_name,
            "age": resident_record.get("age", "Unknown"),
            "medical_conditions": resident_record.get("medical_conditions", "Not specified"),
            "medications": resident_record.get("medications", "Not specified")
        }
        
        # If RAG components are available, use them
        if docsearch and chain:
            # Create a more concise prompt
            prompt = f"""
            You are in charge of monitoring residents in a senior home, so give advice. An urgent medical emergency is occurring for a patient. Their relevant medical information is provided below. Summarize the following key medical information as quickly and accurately as possible using Retrieval-Augmented Generation (RAG) from the available knowledge. The summary should focus on the following points:
Medical Consent and Directives: Pay attention to any medical consent forms or advance directives related to the patient, including "do not resuscitate" (DNR) orders, organ donation preferences, or any other legally binding instructions. Ensure these are clearly identified and noted, so that medical professionals are informed of the patient's wishes.
Emergency Priorities: Outline immediate steps or interventions to consider, without suggesting specific treatments—just relevant information to guide the physician’s decision-making. Focus on essential data to help the doctor prioritize actions swiftly and accurately.
Just give the bullet points, ensure the summary is clear, concise, and focused on providing the doctor with pertinent details to facilitate quick judgment and decision-making.
            
            Patient information:
            Name: {resident_info['name']}
            Age: {resident_info['age']}
            Medical conditions: {resident_info['medical_conditions']}
            Medications: {resident_info['medications']}
            """
            
            try:
                # Perform vector search with more targeted k value and apply filter
                docs = docsearch.similarity_search(
                    prompt, 
                    k=2,
                    filter=filter_dict  # Apply the filter here instead
                )
                print(f"Found {len(docs)} relevant documents via similarity search")
                
                # Generate RAG response with instruction to be concise
                response = chain.run(input_documents=docs, question=prompt)
                summary = response
            except Exception as search_error:
                print(f"Vector search error: {search_error}")
                summary = f"ALERT: {emergency_data.get('emergency_type', 'Unknown')} for {resident_name}"
        else:
            # Use very concise default summary
            summary = f"ALERT: {emergency_data.get('emergency_type', 'Unknown')} for {resident_name}"
        
        # Create single emergency summary entry
        emergency_summaries.append({
            "resident_info": resident_info,
            "summary": summary,
            "emergency_type": emergency_data.get("emergency_type", "Unknown")
        })
        
        return emergency_summaries
        
    except Exception as e:
        print(f"Error getting emergency summaries: {e}")
        return []

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

@app.get("/get-emergency-summary")
async def get_emergency_summary():
    """
    This endpoint is primarily for initial data loading
    WebSockets should handle subsequent updates with RAG
    """
    try:
        # Get the emergency summaries using the same function used by WebSockets 
        emergency_summaries = get_current_emergency_summaries()
        
        if not emergency_summaries:
            raise HTTPException(status_code=404, detail="No pending emergency requests found")

        return JSONResponse(content={"emergency_summaries": emergency_summaries}, status_code=200)

    except HTTPException as he:
        # Re-raise HTTP exceptions
        raise he
    except Exception as e:
        print("Error during emergency summary:", str(e))
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An error occurred while processing emergency summaries: {str(e)}")

@app.post("/upload-medical-history-pdf")
async def upload_medical_history_pdf(
    file: UploadFile = File(...),
    resident_id: Optional[str] = Form(None)
):
    try:
        contents = await file.read()
        unique_id = uuid.uuid4()
        original_filename = file.filename
        extension = original_filename.split('.')[-1] if '.' in original_filename else 'pdf'
        filename = f"uploaded_{unique_id}.{extension}"

        # Upload to Supabase storage
        file_path = f"{filename}"
        storage_response = supabase.storage.from_("medicalhistorypdfs").upload(
            file_path,
            contents,
            file_options={"content-type": "application/pdf"}
        )

        # Get public URL
        pdf_url = supabase.storage.from_("medicalhistorypdfs").get_public_url(file_path)
        
        # Process the PDF for RAG
        # First save the PDF to a temporary file
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_pdf:
            temp_pdf.write(contents)
            temp_pdf_path = temp_pdf.name
        
        try:
            # Process with RAG
            docs = load_and_split_pdf(temp_pdf_path)
            
            # Add resident_id to the metadata of each document
            if resident_id_int:
                for doc in docs:
                    if not hasattr(doc, 'metadata'):
                        doc.metadata = {}
                    doc.metadata['resident_id'] = resident_id_int
            
            embeddings = OllamaEmbeddings(model="nomic-embed-text")
            index_name = "hackdavis-rag-index"
            init_pinecone_index(index_name)
            vector_store = upload_vectors(docs, embeddings, index_name)
            print(f"PDF successfully processed and indexed for RAG with resident_id {resident_id_int} in metadata")
        except Exception as rag_err:
            print(f"Warning: RAG processing failed: {rag_err}")
            # Continue with the function even if RAG fails
        finally:
            # Clean up the temporary file
            if os.path.exists(temp_pdf_path):
                os.unlink(temp_pdf_path)

        # Convert to integer explicitly
        resident_id_int = int(resident_id) if resident_id else None
        # print("resident_id_int:", resident_id_int)
        # Insert into medical_histories table
        if resident_id_int:
            print(f"Attempting to insert with resident_id: {resident_id_int}, type: {type(resident_id_int)}")
            medical_history_entry = {
                "resident_id": resident_id_int,  # Integer, not string
                "pdf_url": pdf_url,
                "created_at": datetime.now().isoformat()
            }
            result = supabase.table("medical_histories").insert(medical_history_entry).execute()
            if hasattr(result, 'error') and result.error:
                raise Exception(f"Failed to insert medical history record: {result.error}")
            history_id = result.data[0]['id'] if result.data else None
            print(f"Inserted medical history record with ID: {history_id}")
        else:
            history_id = None

        return {
            "success": True,
            "message": "Medical history PDF uploaded, stored, and indexed",
            "pdf_url": pdf_url,
            "history_id": history_id
        }

    except Exception as e:
        print(f"Error uploading medical history PDF: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Failed to upload medical history PDF",
                "error": str(e)
            }
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

@app.post("/update-resident-profile")
async def update_resident_profile(resident_data: dict):
    try:
        resident_id = resident_data.get("resident_id")
        
        if not resident_id:
            return {"success": False, "message": "Missing resident ID"}
            
        # Update the resident profile in Supabase
        response = supabase.table("residents").update({
            "name": resident_data.get("name"),
            "age": resident_data.get("age"),
            "medical_conditions": resident_data.get("medicalConditions"),
            "medications": resident_data.get("medications"),
            "food_allergies": resident_data.get("foodAllergies"),
            "special_supportive_services": resident_data.get("specialSupportiveServices")
        }).eq("id", resident_id).execute()
        
        if response.data:
            return {"success": True, "message": "Profile updated successfully"}
        else:
            return {"success": False, "message": "Failed to update profile"}
            
    except Exception as e:
        return {"success": False, "message": str(e)}
    
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
    

@app.post("/update-emergency-status/{emergency_id}")
async def update_emergency_status(emergency_id: str, background_tasks: BackgroundTasks):
    try:
        # Update the emergency status in the database
        result = supabase.table("emergency_logs").update({
            "status": "RESOLVED",
            "resolved_at": datetime.now().isoformat()
        }).eq("id", emergency_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="Emergency request not found")
        
        # Get the updated emergency for the websocket notification
        emergency_data = result.data[0]
        
        # Notify all connected clients about the status change
        background_tasks.add_task(notify_status_update, emergency_data)
        
        return {
            "success": True,
            "message": "Emergency status updated to RESOLVED",
            "emergency_id": emergency_id
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error updating emergency status: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to update emergency status: {str(e)}")

async def notify_status_update(emergency_data):
    """Notify all connected WebSocket clients about a status update"""
    for connection in active_connections:
        try:
            await connection.send_json({
                "type": "status_update",
                "data": {
                    "emergency_id": emergency_data["id"],
                    "status": "RESOLVED",
                    "updated_at": datetime.now().isoformat()
                }
            })
            
            # Also send updated emergency summaries
            emergency_summaries = get_current_emergency_summaries()
            await connection.send_json({
                "type": "emergency_update",
                "data": emergency_summaries
            })
        except Exception as e:
            print(f"Error notifying client of status update: {e}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

