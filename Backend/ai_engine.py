import json
import os
import re
import uuid
from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional, Tuple

from dotenv import load_dotenv
from openai import OpenAI
from supabase import Client, create_client


# ==========================================
# ENVIRONMENT
# ==========================================

load_dotenv()

API_KEY = os.getenv("OPENAI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")


# ==========================================
# CLIENTS
# ==========================================

client = OpenAI(api_key=API_KEY) if API_KEY else None
supabase: Optional[Client] = None

if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


# ==========================================
# CRM FIELD DEFINITIONS
# ==========================================

CRM_FIELDS: Tuple[str, ...] = (
    "Created_By",
    "Company",
    "Attendees",
    "DateofVisit",
    "ObjectiveofVisit",
    "NameDesignationofPersonMet",
    "Current_Consumption",
    "PotentialAccountVol_CM",
    "Current_Supplier",
    "CommercialOfferingBy_Competition",
    "RemarksWayForward",
    "MOMActionItems",
    "SPANCOP_Status",
    "Created_Date",
    "CompanyCustomerCode",
    "Company_Segment",
    "CompanyCustomerSince",
    "Sub_Department",
    "Item_Type",
    "Path",
    "Record_ID",
)

REQUIRED_FIELDS: Tuple[Tuple[str, str], ...] = (
    ("NameDesignationofPersonMet", "Doctor / Person Name"),
    ("Item_Type", "Medicine / Item Name"),
    ("DateofVisit", "Date of Visit"),
)

MISSING_SENTINELS = {
    "",
    "could not extract",
    "n/a",
    "na",
    "unknown",
    "none",
    "null",
}

ALLOWED_SPANCOP_VALUES = (
    "Suspect",
    "Prospect",
    "Approach",
    "Negotiation",
    "Close",
    "Order",
    "Post-sale",
)


# ==========================================
# HELPERS
# ==========================================

def _today_date() -> str:
    return datetime.today().strftime("%Y-%m-%d")


def _generate_record_id() -> str:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    suffix = uuid.uuid4().hex[:6].upper()
    return f"CRM-{timestamp}-{suffix}"


def _strip_code_fences(text: str) -> str:
    cleaned_text = text.strip()

    if cleaned_text.startswith("```"):
        cleaned_text = re.sub(r"^```(?:json)?\s*", "", cleaned_text, flags=re.IGNORECASE)
        cleaned_text = re.sub(r"\s*```$", "", cleaned_text)

    return cleaned_text.strip()


def _parse_json_payload(payload: str) -> Dict[str, Any]:
    cleaned_payload = _strip_code_fences(payload)

    try:
        return json.loads(cleaned_payload)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned_payload, flags=re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise


def _normalize_value(value: Any) -> Optional[Any]:
    if value is None:
        return None

    if isinstance(value, str):
        normalized = value.strip()
        if normalized.lower() in MISSING_SENTINELS or "could not extract" in normalized.lower():
            return None
        return normalized

    return value


def _normalize_record(record: Dict[str, Any], employee_name: str = "", include_generated_ids: bool = False) -> Dict[str, Any]:
    normalized: Dict[str, Any] = {field: None for field in CRM_FIELDS}

    for field in CRM_FIELDS:
        normalized[field] = _normalize_value(record.get(field))

    if employee_name.strip():
        normalized["Created_By"] = employee_name.strip()

    if not normalized.get("Created_Date"):
        normalized["Created_Date"] = _today_date()

    if not normalized.get("SPANCOP_Status"):
        normalized["SPANCOP_Status"] = None
    elif isinstance(normalized["SPANCOP_Status"], str):
        candidate = normalized["SPANCOP_Status"]
        allowed_lookup = {value.lower(): value for value in ALLOWED_SPANCOP_VALUES}
        normalized["SPANCOP_Status"] = allowed_lookup.get(candidate.lower(), candidate)

    if include_generated_ids and not normalized.get("Record_ID"):
        normalized["Record_ID"] = _generate_record_id()

    return normalized


def _validate_required_fields(record: Dict[str, Any]) -> Tuple[List[str], List[str]]:
    missing_labels: List[str] = []
    missing_keys: List[str] = []

    for field_key, field_label in REQUIRED_FIELDS:
        if _normalize_value(record.get(field_key)) is None:
            missing_labels.append(field_label)
            missing_keys.append(field_key)

    return missing_labels, missing_keys


def _save_json_snapshot(record: Dict[str, Any]) -> None:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_dir = os.path.join(base_dir, "output")
    os.makedirs(output_dir, exist_ok=True)

    output_path = os.path.join(output_dir, "structured_output.json")
    with open(output_path, "w", encoding="utf-8") as file_handle:
        json.dump(record, file_handle, indent=4, ensure_ascii=False)


def _save_to_supabase(record: Dict[str, Any]) -> Dict[str, Any]:
    supabase_client = _require_supabase_client()
    response = supabase_client.table("crm_reports").insert(record).execute()
    if response.data:
        inserted = response.data[0]
        if isinstance(inserted, dict):
            return inserted
    return record


def _require_openai_client() -> Any:
    if client is None:
        raise RuntimeError("OPENAI_API_KEY is not configured. Set it in the environment before transcribing audio.")
    return client


def _require_supabase_client() -> Client:
    if supabase is None:
        raise RuntimeError("Supabase credentials are not configured. Set SUPABASE_URL and SUPABASE_KEY before saving records.")
    return supabase


def _transcribe_to_english(audio_path: str) -> str:
    print("🔹 STEP 1: Starting Speech-to-Text")

    openai_client = _require_openai_client()

    with open(audio_path, "rb") as audio_file:
        transcript_response = openai_client.audio.transcriptions.create(
            model="gpt-4o-transcribe",
            file=audio_file,
        )

    original_text = (transcript_response.text or "").strip()

    if not original_text:
        raise ValueError("Speech-to-text returned an empty transcript.")

    print("✅ Speech-to-text complete")
    print("\n----------- ORIGINAL TRANSCRIPT -----------\n")
    print(original_text)

    print("\n🔹 STEP 2: Translating transcript to English")

    translation_response = openai_client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You translate CRM visit transcripts into clear English. "
                    "Preserve names, company names, medicine names, numbers, and dates. "
                    "Do not invent details. Return only the English translation."
                ),
            },
            {"role": "user", "content": original_text},
        ],
        temperature=0,
    )

    english_text = (
        translation_response.choices[0].message.content or ""
    ).strip()

    if not english_text:
        raise ValueError("English translation returned an empty result.")

    print("✅ English conversion completed")
    print("\n----------- ENGLISH TRANSCRIPT -----------\n")
    print(english_text)

    return english_text


def _extract_crm_json(transcript_text: str, employee_name: str = "") -> Dict[str, Any]:
    today_date = _today_date()

    prompt = f"""
You are extracting structured CRM data from a final English transcript.

Rules:
- Use only the transcript provided below.
- Do not invent information.
- Keep names, company names, medicine names, dates, and numbers exactly as spoken when possible.
- ObjectiveofVisit may be inferred from the overall context of the transcript when it is not explicitly stated.
- Return strict JSON only.
- Use null for any missing field.
- Never use "could not extract", "N/A", or "unknown" for required values.
- Use yyyy-MM-dd format when a date is known.
- If the transcript does not mention a value, use null.
- SPANCOP_Status must be one of: {", ".join(ALLOWED_SPANCOP_VALUES)}.

Return exactly these keys:
{{
  "Created_By": "",
  "Company": "",
  "Attendees": "",
  "DateofVisit": "",
  "ObjectiveofVisit": "",
  "NameDesignationofPersonMet": "",
  "Current_Consumption": "",
  "PotentialAccountVol_CM": "",
  "Current_Supplier": "",
  "CommercialOfferingBy_Competition": "",
  "RemarksWayForward": "",
  "MOMActionItems": "",
  "SPANCOP_Status": "",
  "Created_Date": "{today_date}",
  "CompanyCustomerCode": "",
  "Company_Segment": "",
  "CompanyCustomerSince": "",
  "Sub_Department": "",
  "Item_Type": "",
  "Path": "",
  "Record_ID": ""
}}

Employee name metadata: {employee_name.strip() or ""}

Transcript:
{transcript_text}
"""

    print("🔹 STEP 3: Sending transcript to CRM extractor")

    response = _require_openai_client().chat.completions.create(
        model="gpt-4.1",
        messages=[
            {
                "role": "system",
                "content": "You extract CRM information and respond with strict JSON only.",
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0,
        response_format={"type": "json_object"},
    )

    raw_payload = response.choices[0].message.content or "{}"
    extracted_record = _parse_json_payload(raw_payload)

    normalized_record = _normalize_record(
        extracted_record,
        employee_name=employee_name,
        include_generated_ids=False,
    )

    print("✅ CRM extraction complete")
    print("\n----------- EXTRACTED CRM JSON -----------\n")
    print(json.dumps(normalized_record, indent=4, ensure_ascii=False))

    return normalized_record


def _build_review_response(record: Dict[str, Any]) -> Dict[str, Any]:
    missing_labels, missing_keys = _validate_required_fields(record)
    status = "success" if not missing_labels else "missing_fields"

    return {
        "status": status,
        "data": record,
        "missing_required_fields": missing_labels,
        "missing_required_field_keys": missing_keys,
    }


def _finalize_record(record: Dict[str, Any], employee_name: str = "") -> Dict[str, Any]:
    finalized_record = _normalize_record(
        record,
        employee_name=employee_name,
        include_generated_ids=True,
    )

    missing_labels, missing_keys = _validate_required_fields(finalized_record)
    if missing_labels:
        return {
            "status": "incomplete",
            "data": finalized_record,
            "missing_required_fields": missing_labels,
            "missing_required_field_keys": missing_keys,
        }

    _save_json_snapshot(finalized_record)
    inserted_record = _save_to_supabase(finalized_record)

    print("🔹 STEP 6: Supabase save complete")
    print("✅ Data saved to Supabase successfully")

    return {
        "status": "success",
        "data": inserted_record,
        "missing_required_fields": [],
        "missing_required_field_keys": [],
        "record_id": inserted_record.get("Record_ID", finalized_record.get("Record_ID")),
    }


# ==========================================
# PUBLIC API
# ==========================================

def transcribe_audio(audio_path: str) -> str:
    print("🎙 transcribe_audio() STARTED")

    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    file_size = os.path.getsize(audio_path)
    print(f"📁 Audio file: {audio_path}")
    print(f"📦 Audio size: {file_size} bytes")

    if file_size == 0:
        raise ValueError("Audio file is empty.")

    english_text = _transcribe_to_english(audio_path)

    print("\n🎙 transcribe_audio() ENDED")
    return english_text


def extract_crm_data(transcript: str, employee_name: str = "") -> Dict[str, Any]:
    print("🔥 extract_crm_data() STARTED")

    if not transcript.strip():
        raise ValueError("Transcript cannot be empty.")

    record = _extract_crm_json(transcript, employee_name=employee_name)
    review = _build_review_response(record)

    print("🔥 extract_crm_data() ENDED")
    return review


def finalize_crm_report(
    data: Optional[Dict[str, Any]] = None,
    manual_fields: Optional[Dict[str, Any]] = None,
    employee_name: str = "",
    transcript: str = "",
) -> Dict[str, Any]:
    print("🔥 finalize_crm_report() STARTED")

    base_record: Dict[str, Any] = dict(data or {})
    if not base_record and transcript.strip():
        base_record = _extract_crm_json(transcript, employee_name=employee_name)

    merged_record = dict(base_record)
    for field_key, field_value in (manual_fields or {}).items():
        if field_value is not None and str(field_value).strip():
            merged_record[field_key] = field_value

    result = _finalize_record(merged_record, employee_name=employee_name)

    print("🔥 finalize_crm_report() ENDED")
    return result


def process_audio(
    audio_path: Optional[str] = None,
    transcript_text: Optional[str] = None,
    employee_name: str = "",
    save_json: bool = True,
):
    print("🔥 process_audio() STARTED")

    if transcript_text is None:
        if not audio_path:
            raise ValueError("Either audio_path or transcript_text must be provided.")
        transcript_text = transcribe_audio(audio_path)

    review = extract_crm_data(transcript_text, employee_name=employee_name)

    if review["status"] != "success":
        print("🔥 process_audio() ENDED WITH INCOMPLETE DATA")
        return review

    if save_json:
        finalized = finalize_crm_report(
            data=review["data"],
            manual_fields=None,
            employee_name=employee_name,
            transcript=transcript_text,
        )
        print("🔥 process_audio() ENDED")
        return finalized

    print("🔥 process_audio() ENDED")
    return review


def get_all_records() -> List[Dict[str, Any]]:
    try:
        supabase_client = _require_supabase_client()
        response = (
            supabase_client.table("crm_reports")
            .select("*")
            .order("Created_Date", desc=True)
            .execute()
        )
        return response.data or []
    except Exception as exc:
        print("\n❌ Error fetching records:")
        print(type(exc).__name__)
        print(str(exc))
        return []