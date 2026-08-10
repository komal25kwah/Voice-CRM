import os
import json
from datetime import datetime

from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client, Client


# ==========================================
# LOAD ENVIRONMENT VARIABLES
# ==========================================

load_dotenv()

API_KEY = os.getenv("OPENAI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")


if not API_KEY:
    raise ValueError(
        "OPENAI_API_KEY not found in .env file"
    )


if not SUPABASE_URL:
    raise ValueError(
        "SUPABASE_URL not found in .env file"
    )


if not SUPABASE_KEY:
    raise ValueError(
        "SUPABASE_KEY not found in .env file"
    )


# ==========================================
# OPENAI CLIENT
# ==========================================

client = OpenAI(
    api_key=API_KEY
)


# ==========================================
# SUPABASE CLIENT
# ==========================================

supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)


# ==========================================
# SPEECH TO TEXT + ENGLISH CONVERSION
# ==========================================

def transcribe_audio(audio_path):

    print("🎙 transcribe_audio() STARTED")


    # --------------------------------------
    # Check if audio exists
    # --------------------------------------

    if not os.path.exists(audio_path):

        raise FileNotFoundError(
            f"Audio file not found: {audio_path}"
        )


    # --------------------------------------
    # Show file information
    # --------------------------------------

    file_size = os.path.getsize(audio_path)

    print(
        f"📁 Audio file: {audio_path}"
    )

    print(
        f"📦 Audio size: {file_size} bytes"
    )


    if file_size == 0:

        raise ValueError(
            "Audio file is empty."
        )


    # ======================================
    # STEP 1: AUDIO → ORIGINAL TRANSCRIPT
    # ======================================

    print(
        "🔹 STEP 1: Starting Speech-to-Text..."
    )


    try:

        print(
            "🔹 Opening audio file..."
        )


        with open(
            audio_path,
            "rb"
        ) as audio_file:

            print(
                "🔹 Audio file opened successfully."
            )

            print(
                "🔹 Sending audio to OpenAI..."
            )


            transcript = client.audio.transcriptions.create(

                model="gpt-4o-transcribe",

                file=audio_file

            )


        print(
            "✅ OpenAI transcription response received."
        )


    except Exception as e:

        print(
            "\n❌ OPENAI TRANSCRIPTION ERROR"
        )

        print(
            "Error Type:",
            type(e).__name__
        )

        print(
            "Error:",
            str(e)
        )

        raise


    # --------------------------------------
    # Get original transcript
    # --------------------------------------

    original_text = transcript.text


    print(
        "✅ Speech-to-Text completed."
    )


    print(
        "\n----------- ORIGINAL TRANSCRIPT -----------\n"
    )

    print(
        original_text
    )


    # ======================================
    # STEP 2: ORIGINAL → ENGLISH
    # ======================================

    print(
        "\n🔹 STEP 2: Converting transcript to English..."
    )


    try:

        translation_response = client.chat.completions.create(

            model="gpt-4.1-mini",

            messages=[

                {
                    "role": "system",

                    "content": (
                        "You are a professional translator "
                        "for a business CRM system.\n\n"

                        "Translate the provided transcript "
                        "into clear and natural English.\n\n"

                        "IMPORTANT RULES:\n"

                        "- Translate only what is actually said.\n"

                        "- Do not add or invent information.\n"

                        "- Preserve people's names exactly "
                        "as spoken as much as possible.\n"

                        "- Preserve company names.\n"

                        "- Preserve medicine and product names.\n"

                        "- Preserve dates and numbers.\n"

                        "- Preserve the meaning of the "
                        "original speech.\n"

                        "- Return only the English translation.\n"

                        "- Do not add explanations."
                    )
                },

                {
                    "role": "user",

                    "content": original_text
                }

            ],

            temperature=0

        )


        english_text = (
            translation_response
            .choices[0]
            .message
            .content
            .strip()
        )


        print(
            "✅ English conversion completed."
        )


    except Exception as e:

        print(
            "\n❌ ENGLISH TRANSLATION ERROR"
        )

        print(
            "Error Type:",
            type(e).__name__
        )

        print(
            "Error:",
            str(e)
        )

        raise


    # ======================================
    # SHOW ENGLISH TRANSCRIPT
    # ======================================

    print(
        "\n----------- ENGLISH TRANSCRIPT -----------\n"
    )

    print(
        english_text
    )


    print(
        "\n🎙 transcribe_audio() ENDED"
    )


    # ======================================
    # RETURN ENGLISH TRANSCRIPT
    # ======================================

    return english_text


# ==========================================
# AI ENGINE
# ==========================================

def process_audio(
    audio_path,
    save_json=True
):

    print(
        "🔥 process_audio() STARTED"
    )


    # --------------------------------------
    # Check if audio exists
    # --------------------------------------

    if not os.path.exists(audio_path):

        raise FileNotFoundError(
            f"Audio file not found: {audio_path}"
        )


    print(
        "Transcribing audio..."
    )

    print(
        "🔹 STEP 1: Starting Speech-to-Text"
    )


    # ======================================
    # STEP 1: SPEECH TO TEXT
    # ======================================

    with open(
        audio_path,
        "rb"
    ) as audio_file:

        transcript = client.audio.transcriptions.create(

            model="gpt-4o-transcribe",

            file=audio_file

        )


    speech_text = transcript.text


    print(
        "✅ STEP 1 Complete"
    )


    print(
        "\n----------- TRANSCRIPTION -----------\n"
    )

    print(
        speech_text
    )


    # ======================================
    # STEP 2: GPT PROMPT
    # ======================================

    today_date = datetime.today().strftime(
        "%Y-%m-%d"
    )


    prompt = f"""
You are a sales CRM data extraction assistant.

Convert the following sales visit speech into STRICT JSON format.

IMPORTANT RULES:

- The speech may be in Urdu.
- Translate all extracted information into English.
- Return JSON values only in English.
- Do not write any Urdu words.
- Keep company names and people's names in English.
- Return ONLY valid JSON.
- Do not add explanations.
- Use yyyy-MM-dd date format.
- If any field is missing, write "could not extract".
- Do not leave any field blank.
- Extract attendees separately if mentioned.

SPANCOP_Status must be one of:

Suspect,
Prospect,
Approach,
Negotiation,
Close,
Order,
Post-sale

Return this JSON:

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

Speech:

{speech_text}
"""


    print(
        "\nStructuring data..."
    )

    print(
        "🔹 STEP 2: Sending prompt to GPT"
    )


    # ======================================
    # STEP 3: GPT EXTRACTION
    # ======================================

    response = client.chat.completions.create(

        model="gpt-4.1",

        messages=[

            {
                "role": "system",

                "content": (
                    "You extract structured CRM data "
                    "strictly in JSON."
                )
            },

            {
                "role": "user",

                "content": prompt
            }

        ],

        temperature=0

    )


    structured_output = (
        response
        .choices[0]
        .message
        .content
    )


    print(
        "✅ STEP 2 Complete"
    )


    # ======================================
    # STEP 4: JSON VALIDATION
    # ======================================

    print(
        "🔹 STEP 3: Parsing JSON"
    )


    try:

        structured_json = json.loads(
            structured_output
        )


    except json.JSONDecodeError:

        print(
            "\n❌ ERROR: GPT did not return valid JSON.\n"
        )

        print(
            structured_output
        )

        return None


    print(
        "✅ STEP 3 Complete"
    )


    # ======================================
    # FIX DATE FIELDS
    # ======================================

    date_fields = [

        "DateofVisit",

        "CompanyCustomerSince"

    ]


    for field in date_fields:

        if (
            structured_json.get(field)
            == "could not extract"
        ):

            structured_json[field] = None


    # ======================================
    # DISPLAY CRM JSON
    # ======================================

    print(
        "\n----------- CRM JSON -----------\n"
    )


    print(
        json.dumps(
            structured_json,
            indent=4,
            ensure_ascii=False
        )
    )


    # ======================================
    # STEP 5: SAVE JSON
    # ======================================

    if save_json:

        BASE_DIR = os.path.dirname(
            os.path.dirname(
                os.path.abspath(__file__)
            )
        )


        OUTPUT_DIR = os.path.join(
            BASE_DIR,
            "output"
        )


        os.makedirs(
            OUTPUT_DIR,
            exist_ok=True
        )


        output_path = os.path.join(
            OUTPUT_DIR,
            "structured_output.json"
        )


        with open(
            output_path,
            "w",
            encoding="utf-8"
        ) as f:

            json.dump(

                structured_json,

                f,

                indent=4,

                ensure_ascii=False

            )


        print(
            "\nJSON saved successfully to:"
        )

        print(
            output_path
        )


    # ======================================
    # STEP 6: SAVE TO SUPABASE
    # ======================================

    print(
        "🔹 STEP 4: Saving to Supabase"
    )


    try:

        supabase.table(
            "crm_reports"
        ).insert(
            structured_json
        ).execute()


        print(
            "\n✅ Data saved to Supabase successfully."
        )


        print(
            "✅ STEP 4 Complete"
        )


    except Exception as e:

        print(
            "\n❌ Error saving to Supabase:"
        )

        print(
            type(e).__name__
        )

        print(
            str(e)
        )


    print(
        "🔥 process_audio() ENDED"
    )


    return structured_json


# ==========================================
# GET ALL RECORDS
# ==========================================

def get_all_records():

    try:

        response = (

            supabase

            .table(
                "crm_reports"
            )

            .select("*")

            .order(
                "Created_Date",
                desc=True
            )

            .execute()

        )


        return response.data


    except Exception as e:

        print(
            "\n❌ Error fetching records:"
        )

        print(
            type(e).__name__
        )

        print(
            str(e)
        )


        return []