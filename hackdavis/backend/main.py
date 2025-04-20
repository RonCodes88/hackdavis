from fastapi import FastAPI, UploadFile, File, HTTPException, Form, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
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


@app.get("/get-detections/{filename}")
async def get_detections(filename: str):
    # Example format
    detection_data = {1: {'label': 'sauce', 'box': [290, 379, 396, 590]}, 2: {'label': 'sauce', 'box': [391, 387, 497, 591]}, 3: {'label': 'peanutbutter', 'box': [192, 683, 283, 852]}, 4: {'label': 'pasta', 'box': [80, 773, 188, 849]}, 5: {'label': 'pasta', 'box': [456, 55, 557, 288]}, 6: {'label': 'chocolate', 'box': [490, 382, 597, 601]}, 7: {'label': 'peanutbutter', 'box': [193, 620, 289, 772]}, 8: {'label': 'broth', 'box': [329, 0, 465, 242]}, 9: {'label': 'pasta', 'box': [35, 216, 136, 248]}, 10: {'label': 'noodles', 'box': [11, 617, 600, 897]}, 11: {'label': 'noodles', 'box': [191, 619, 289, 723]}, 12: {'label': 'beans', 'box': [181, 352, 303, 581]}, 13: {'label': 'elbows', 'box': [157, 21, 327, 290]}, 14: {'label': 'broth', 'box': [285, 624, 348, 851]}, 15: {'label': 'beans', 'box': [0, 308, 600, 891]}, 16: {'label': 'peanutbutter', 'box': [201, 221, 285, 253]}, 17: {'label': 'pasta', 'box': [210, 161, 257, 202]}, 18: {'label': 'elbows', 'box': [0, 114, 165, 288]}, 19: {'label': 'chocolate', 'box': [485, 382, 598, 602]}, 20: {'label': 'noodles', 'box': [343, 622, 408, 849]}, 21: {'label': 'pasta', 'box': [390, 197, 454, 268]}, 22: {'label': 'pasta', 'box': [0, 0, 599, 766]}, 23: {'label': 'beans', 'box': [4, 296, 600, 900]}, 24: {'label': 'pasta', 'box': [257, 223, 285, 252]}, 25: {'label': 'beans', 'box': [184, 357, 303, 579]}, 26: {'label': 'pasta', 'box': [458, 33, 595, 286]}, 27: {'label': 'pasta', 'box': [56, 155, 105, 196]}, 28: {'label': 'elbows', 'box': [0, 14, 327, 295]}, 29: {'label': 'elbows', 'box': [33, 216, 136, 248]}, 30: {'label': 'elbows', 'box': [480, 332, 598, 378]}, 31: {'label': 'sauce', 'box': [363, 247, 390, 270]}, 32: {'label': 'beans', 'box': [184, 357, 302, 579]}, 33: {'label': 'sauce', 'box': [14, 311, 108, 381]}, 34: {'label': 'ramen', 'box': [131, 802, 184, 834]}, 35: {'label': 'elbows', 'box': [0, 29, 163, 289]}, 36: {'label': 'elbows', 'box': [156, 115, 315, 283]}, 37: {'label': 'noodles', 'box': [322, 314, 489, 409]}, 38: {'label': 'pasta', 'box': [461, 31, 598, 222]}, 39: {'label': 'broth', 'box': [45, 617, 192, 814]}}
    
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
    """
    try:
        # Fetch all emergency logs with PENDING status
        emergency_result = (supabase.table("emergency_logs")
                          .select("*")
                          .eq("status", "PENDING")
                          .order("timestamp", desc=True)
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
            
            # Use the new PineconeVectorStore class with the proper initialization
            docsearch = PineconeVectorStore(
                index_name=index_name,
                embedding=embeddings,
                text_key="text",
                pinecone_api_key=PINECONE_API_KEY
            )
            print("Successfully initialized Pinecone vector store for WebSocket notifications")
            
            # Initialize LLM for RAG
            llm = ChatCerebras(api_key=CEREBRAS_API_KEY, model="llama-3.3-70b")
            chain = load_qa_chain(llm, chain_type="stuff")
            
        except Exception as e:
            print(f"Error initializing RAG components for WebSocket: {e}")
            docsearch = None
            chain = None
            
        # Process each emergency
        emergency_summaries = []
        for emergency_data in emergency_result.data:
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
                
            # Compile resident info
            resident_info = {
                "name": resident_name,
                "age": resident_record.get("age", "Unknown"),
                "medical_conditions": resident_record.get("medical_conditions", "Not specified"),
                "medications": resident_record.get("medications", "Not specified"),
                "food_allergies": resident_record.get("food_allergies", "Not specified"),
                "special_supportive_services": resident_record.get("special_supportive_services", "Not specified")
            }
            
            # If RAG components are available, use them
            if docsearch and chain:
                prompt = f"""
                An urgent medical emergency is occurring for a patient. Their relevant medical information is provided below. Summarize the following key medical information as quickly and accurately as possible using Retrieval-Augmented Generation (RAG) from the available knowledge. The summary should focus on the following points:
                Known Issues and Chronic Diseases: List the most current critical health symptoms observed and their duration, if known. Pay special attention to chronic diseases, and clearly list them. Include any unusual patterns or red flags with the patient that might require special attention.
                Phone Numbers: Identify and list the phone numbers of professional emergency contacts, such as the family doctor, local emergency services, emergency road service providers, regional poison control center, and other relevant emergency contacts for the patient. Clearly label each number with the corresponding contact's name and role (e.g., doctor, emergency service, etc.).
                Medical History and Current Medications: Highlight the patient's blood type, relevant past medical conditions, recent surgeries, operations, allergies, or any significant medical history pertinent to the current situation. Include a list of ongoing medications, dosages, and note any recent changes or adjustments.
                Emergency Priorities: Outline immediate steps or interventions to consider, without suggesting specific treatments—just relevant information to guide the physician's decision-making. Focus on essential data to help the doctor prioritize actions swiftly and accurately.
                
                Patient information:
                Name: {resident_info['name']}
                Age: {resident_info['age']}
                Medical conditions: {resident_info['medical_conditions']}
                Medications: {resident_info['medications']}
                Food allergies: {resident_info['food_allergies']}
                Special supportive services: {resident_info['special_supportive_services']}
                """
                
                try:
                    # Perform vector search
                    docs = docsearch.similarity_search(prompt, k=3)
                    print(f"Found {len(docs)} relevant documents via similarity search for WebSocket")
                    
                    # Generate RAG response
                    response = chain.run(input_documents=docs, question=prompt)
                    summary = response
                except Exception as search_error:
                    print(f"Vector search error in WebSocket: {search_error}")
                    summary = f"EMERGENCY: {emergency_data.get('emergency_type', 'Unknown')} - Medical staff has been notified. Full medical details available."
            else:
                # Use default summary if RAG is not available
                summary = f"EMERGENCY: {emergency_data.get('emergency_type', 'Unknown')} - Medical staff has been notified. Full medical details available."
            
            # Create the emergency summary entry
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
            embeddings = OllamaEmbeddings(model="nomic-embed-text")
            index_name = "hackdavis-rag-index"
            init_pinecone_index(index_name)
            vector_store = upload_vectors(docs, embeddings, index_name)
            print(f"PDF successfully processed and indexed for RAG")
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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

