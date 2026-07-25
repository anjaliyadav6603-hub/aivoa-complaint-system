import os
import json
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from pypdf import PdfReader
import io

load_dotenv()

extraction_llm = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model="llama-3.1-8b-instant",
)

SYSTEM_PROMPT = """You are an AI assistant for a pharmaceutical Quality Management System (QMS).
Extract structured complaint data from the user's message. Respond with ONLY valid JSON, no other text, no markdown code fences.

Return a JSON object with these exact keys (use null for any field not mentioned):
{
  "complaint_source": string or null,
  "customer_name": string or null,
  "product_name": string or null,
  "product_strength": string or null,
  "batch_lot_number": string or null,
  "affected_quantity": string or null,
  "manufacturing_date": string or null,
  "expiry_date": string or null,
  "originating_site_block": string or null,
  "impacted_npm": string or null,
  "complaint_category": string or null,
  "complaint_description": string or null,
  "severity": string or null,
  "suggested_next_action": string or null,
  "initial_risk_assessment": string or null
}

Guidance:
- complaint_source = who/where the complaint came from (e.g. "Pharmacy", "Email", "Distributor")
- customer_name = the name of the reporting organization or person (e.g. "Apollo Pharmacy")
- Use your own reasoning as a QMS expert to assess severity, suggested_next_action, and initial_risk_assessment based on the complaint details, even if not explicitly stated by the user.
"""

def extract_complaint_fields(user_message: str) -> dict:
    response = extraction_llm.invoke([
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ])
    return json.loads(response.content)
EDIT_SYSTEM_PROMPT = """You are an AI assistant for a pharmaceutical Quality Management System (QMS).
The user is correcting or updating a complaint that has already been logged. You will be given the CURRENT complaint data and a correction message.

Respond with ONLY valid JSON containing ONLY the fields that need to change based on the correction message. Do NOT include fields that weren't mentioned in the correction. Do NOT include unchanged fields.

Possible keys you may include (only if mentioned): complaint_source, customer_name, product_name, product_strength, batch_lot_number, affected_quantity, manufacturing_date, expiry_date, originating_site_block, impacted_npm, complaint_category, complaint_description, severity, suggested_next_action, initial_risk_assessment

If the correction changes something that would affect risk assessment (e.g. quantity, product, defect type), you may also update severity, suggested_next_action, or initial_risk_assessment using your reasoning.
"""

def edit_complaint_fields(current_complaint: dict, correction_message: str) -> dict:
    context = f"CURRENT COMPLAINT DATA:\n{json.dumps(current_complaint, indent=2)}\n\nCORRECTION MESSAGE:\n{correction_message}"

    response = extraction_llm.invoke([
        {"role": "system", "content": EDIT_SYSTEM_PROMPT},
        {"role": "user", "content": context},
    ])
    return json.loads(response.content)
def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(file_bytes))
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text
DUPLICATE_CHECK_PROMPT = """You are an AI assistant for a pharmaceutical Quality Management System (QMS).
You will be given a NEW complaint and a list of EXISTING complaints. Determine if the new complaint is likely a duplicate of any existing one (same product, same or very similar batch number, same type of defect).

Respond with ONLY valid JSON in this exact format:
{
  "is_duplicate": true or false,
  "duplicate_of_id": integer or null,
  "reason": "short explanation"
}

If there's no clear duplicate, return is_duplicate: false, duplicate_of_id: null.
"""

def check_duplicate(new_complaint: dict, existing_complaints: list) -> dict:
    if not existing_complaints:
        return {"is_duplicate": False, "duplicate_of_id": None, "reason": "No existing complaints to compare."}

    # Keep the comparison list lightweight — only relevant fields
    simplified_existing = [
        {
            "id": c.get("id"),
            "product_name": c.get("product_name"),
            "batch_lot_number": c.get("batch_lot_number"),
            "complaint_category": c.get("complaint_category"),
            "complaint_description": c.get("complaint_description"),
        }
        for c in existing_complaints
    ]

    context = f"NEW COMPLAINT:\n{json.dumps(new_complaint, indent=2)}\n\nEXISTING COMPLAINTS:\n{json.dumps(simplified_existing, indent=2)}"

    response = extraction_llm.invoke([
        {"role": "system", "content": DUPLICATE_CHECK_PROMPT},
        {"role": "user", "content": context},
    ])
    return json.loads(response.content)
