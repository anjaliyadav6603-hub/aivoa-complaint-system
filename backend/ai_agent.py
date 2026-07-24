import os
import json
from dotenv import load_dotenv
from langchain_groq import ChatGroq

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