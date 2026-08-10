from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
import shutil
import os

from ai_engine import transcribe_audio, process_audio, get_all_records


# ==========================================
# FASTAPI APP
# ==========================================

app = FastAPI(title="Voice CRM API")


# ==========================================
# CORS
# ==========================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# ==========================================
# UPLOAD FOLDER
# ==========================================

UPLOAD_FOLDER = "audio"

os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True
)


# ==========================================
# REQUEST MODEL
# ==========================================

class TranscriptRequest(BaseModel):

    transcript: str
    employee_name: str = ""


# ==========================================
# HOME
# ==========================================

@app.get("/")
def home():

    return {
        "message": "Voice CRM API is Running"
    }


# ==========================================
# STEP 1
# AUDIO → TRANSCRIPT
# ==========================================

@app.post("/transcribe-audio")
async def transcribe_audio_endpoint(
    file: UploadFile = File(...)
):

    print("\n====================================")
    print("🎙 TRANSCRIPTION REQUEST RECEIVED")
    print("====================================")

    file_path = os.path.join(
        UPLOAD_FOLDER,
        file.filename
    )

    # --------------------------------------
    # Save audio
    # --------------------------------------

    with open(
        file_path,
        "wb"
    ) as buffer:

        shutil.copyfileobj(
            file.file,
            buffer
        )

    print("✅ Audio saved:", file_path)

    # --------------------------------------
    # Speech → English Transcript
    # --------------------------------------

    print("🎙 Starting transcription...")

    transcript = transcribe_audio(
        file_path
    )

    print("✅ English transcript generated")

    print("\n----------- ENGLISH TRANSCRIPT -----------")
    print(transcript)
    print("------------------------------------------\n")

    return {
        "status": "success",
        "transcript": transcript
    }


# ==========================================
# STEP 2
# EDITED TRANSCRIPT → CRM
# ==========================================

@app.post("/process-transcript")
async def process_transcript(
    request: TranscriptRequest
):

    print("\n====================================")
    print("📝 EDITED TRANSCRIPT RECEIVED")
    print("====================================")

    print("Employee:", request.employee_name)

    print("\n----------- FINAL TRANSCRIPT -----------")
    print(request.transcript)
    print("-----------------------------------------\n")

    # --------------------------------------
    # Validate transcript
    # --------------------------------------

    if not request.transcript.strip():

        print("❌ Transcript is empty")

        return {
            "status": "error",
            "message": "Transcript cannot be empty."
        }

    # --------------------------------------
    # Process edited transcript
    # --------------------------------------

    print("🤖 Sending transcript to AI...")
    print("🔹 Extracting CRM fields...")

    result = process_audio(
        audio_path=None,
        transcript_text=request.transcript,
        employee_name=request.employee_name
    )

    print("✅ CRM processing completed")

    # --------------------------------------
    # Return result
    # --------------------------------------

    return result


# ==========================================
# OLD AUDIO UPLOAD ENDPOINT
# ==========================================

@app.post("/upload-audio")
async def upload_audio(
    file: UploadFile = File(...)
):

    print("\n====================================")
    print("📤 DIRECT AUDIO UPLOAD REQUEST")
    print("====================================")

    file_path = os.path.join(
        UPLOAD_FOLDER,
        file.filename
    )

    # --------------------------------------
    # Save audio
    # --------------------------------------

    with open(
        file_path,
        "wb"
    ) as buffer:

        shutil.copyfileobj(
            file.file,
            buffer
        )

    print("✅ File saved:", file_path)

    # --------------------------------------
    # Process audio directly
    # --------------------------------------

    print("🤖 Calling process_audio()")

    result = process_audio(
        file_path
    )

    print("✅ process_audio finished")

    return result


# ==========================================
# GET ALL CRM RECORDS
# ==========================================

@app.get("/records")
def get_records():

    print("\n📊 Fetching CRM records...")

    records = get_all_records()

    print(
        f"✅ {len(records)} records found"
    )

    return {

        "status": "success",

        "count": len(records),

        "data": records
    }