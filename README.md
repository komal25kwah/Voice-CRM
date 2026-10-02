#  AI Voice CRM

An AI-powered Voice CRM system that converts employee voice-based customer visit reports into structured CRM records automatically.

##  Project Overview

AI Voice CRM is designed to simplify the process of recording and managing customer visit reports.

Instead of manually filling lengthy CRM forms or Excel sheets, an employee can record or upload a voice summary of their customer visit.

The system:

1. Records or uploads the employee's audio.   
2. Converts speech into text using AI.
3. Converts the transcript into clear English.
4. Allows the employee to review and edit the English transcript.
5. Extracts important CRM fields automatically.
6. Stores the structured information in a database.
7. Displays submitted reports on a Manager Dashboard.

---

##  Key Features

###  Voice Recording
Employees can record their customer visit directly from the web interface.

###  Audio Upload
Previously recorded audio files can also be uploaded.

###  Speech-to-Text
AI converts the employee's voice report into text.

###  English Transcript
The system converts the spoken report into an English transcript.

###  Transcript Review & Editing
Employees can review the generated English transcript and manually correct:

- Names
- Medicine/Product names
- Dates
- Numbers
- Spelling mistakes
- Other transcription errors

###  AI CRM Data Extraction
The system extracts important information from the transcript into structured CRM fields.

### Database Storage
Structured CRM reports are stored in Supabase/PostgreSQL.

###  Manager Dashboard
Managers can view submitted customer visit reports through a centralized dashboard.

---

##  System Workflow

```text
Employee
   │
   ▼
Record / Upload Audio
   │
   ▼
Speech-to-Text
   │
   ▼
English Transcript
   │
   ▼
Employee Reviews & Edits
   │
   ▼
AI CRM Field Extraction
   │
   ▼
Required Field Validation
   │
   ▼
Supabase Database
   │
   ▼
Manager Dashboard
