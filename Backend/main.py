import os
import sys
import shutil
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from ai_engine import (
    extract_crm_data,
    finalize_crm_report,
    get_all_records,
    transcribe_audio,
)


# ==========================================
# FASTAPI APP
# ==========================================

app = FastAPI(title="Voice CRM API")


# ==========================================
# CORS
# ==========================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=False,

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

    transcript: str = Field(...)
    employee_name: str = ""

    Latitude: float | None = None
    Longitude: float | None = None
    Location_Accuracy: float | None = None


class FinalizeRequest(BaseModel):

    transcript: str = ""
    employee_name: str = ""
    data: Dict[str, Any] = Field(default_factory=dict)
    manual_fields: Dict[str, Any] = Field(default_factory=dict)


def save_uploaded_audio(file: UploadFile) -> str:

    file_name = file.filename or "audio.webm"
    extension = os.path.splitext(file_name)[1] or ".webm"
    safe_name = f"{uuid.uuid4().hex}{extension}"

    file_path = os.path.join(
        UPLOAD_FOLDER,
        safe_name
    )

    with open(
        file_path,
        "wb"
    ) as buffer:

        shutil.copyfileobj(
            file.file,
            buffer
        )

    return file_path


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

    file_path = save_uploaded_audio(file)

    print("✅ Audio saved:", file_path)

    # --------------------------------------
    # Speech → English Transcript
    # --------------------------------------

    print("🎙 Starting transcription...")

    try:

        transcript = transcribe_audio(file_path)

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {exc}"
        ) from exc

    print("✅ English transcript generated")

   
    return {
        "status": "success",
        "transcript": transcript
    }


# ==========================================
# STEP 2
# EDITED TRANSCRIPT → CRM REVIEW
# ==========================================

@app.post("/extract-crm")
async def extract_crm(request: TranscriptRequest):

    print("\n====================================")
    print("📝 FINAL TRANSCRIPT RECEIVED")
    print("====================================")

    print("Employee:", request.employee_name)
    print("\n----------- FINAL TRANSCRIPT -----------")
    print(request.transcript)
    print("-----------------------------------------\n")

    if not request.transcript.strip():
        raise HTTPException(
            status_code=400,
            detail="Transcript cannot be empty."
        )

    try:

        result = extract_crm_data(
            transcript=request.transcript,
            employee_name=request.employee_name
        )

        result["Latitude"] = request.Latitude
        result["Longitude"] = request.Longitude
        result["Location_Accuracy"] = request.Location_Accuracy

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"CRM extraction failed: {exc}"
        ) from exc

    print("✅ CRM review complete")

    return result


@app.post("/save-crm")
async def save_crm(request: FinalizeRequest):

    print("\n====================================")
    print("💾 FINAL CRM SAVE REQUEST RECEIVED")
    print("====================================")

    print("Employee:", request.employee_name)

    try:

        result = finalize_crm_report(
            data=request.data,
            manual_fields=request.manual_fields,
            employee_name=request.employee_name,
            transcript=request.transcript
        )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"CRM save failed: {exc}"
        ) from exc

    return result


@app.post("/process-transcript")
async def process_transcript(request: TranscriptRequest):

    print("\n====================================")
    print("🧠 PROCESS TRANSCRIPT REQUEST RECEIVED")
    print("====================================")

    print("Employee:", request.employee_name)
    print("\n----------- FINAL EDITED TRANSCRIPT -----------")
    print(request.transcript)
    print("----------------------------------------------\n")
    print("📍 RECEIVED LOCATION:")
    print("Latitude:", request.Latitude)
    print("Longitude:", request.Longitude)
    print("Accuracy:", request.Location_Accuracy)

    if not request.transcript.strip():
        raise HTTPException(
            status_code=400,
            detail="Transcript cannot be empty."
        )

    try:
        result = extract_crm_data(
            transcript=request.transcript,
            employee_name=request.employee_name
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"CRM extraction failed: {exc}"
        ) from exc

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

    file_path = save_uploaded_audio(file)

    print("✅ File saved:", file_path)

    try:

        transcript = transcribe_audio(file_path)

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {exc}"
        ) from exc

    return {
        "status": "success",
        "transcript": transcript,
        "message": "Audio uploaded and transcribed. Use /extract-crm with the final edited transcript.",
    }


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

    #Uvicorn running on http://127.0.0.1:8000