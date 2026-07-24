import os
import json
from dotenv import load_dotenv
from langchain_groq import ChatGroq

load_dotenv()

llm = ChatGroq(
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
  "complaint_category": string or null,
  "complaint_description": string or null,
  "severity": string or null,
  "suggested_next_action": string or null,
  "initial_risk_assessment": string or null
}

For severity, suggested_next_action, and initial_risk_assessment: use your own reasoning as a QMS expert to assess these based on the complaint details, even if not explicitly stated by the user.
"""

test_message = "Apollo Pharmacy reported discolored capsules in Amoxicillin Capsules 500mg. Batch number AMX240602. Manufacturing date March 2026. Expiry date February 2028."

response = llm.invoke([
    {"role": "system", "content": SYSTEM_PROMPT},
    {"role": "user", "content": test_message},
])

print("RAW RESPONSE:")
print(response.content)

print("\nPARSED JSON:")
parsed = json.loads(response.content)
print(json.dumps(parsed, indent=2))