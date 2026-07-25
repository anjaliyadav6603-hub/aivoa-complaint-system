import os
import json
import io
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from pypdf import PdfReader
from typing import TypedDict, Optional
from langgraph.graph import StateGraph, END

load_dotenv()

extraction_llm = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model="llama-3.1-8b-instant",
)

# ---------- Shared state definition ----------

class ComplaintAgentState(TypedDict):
    mode: str                      # "extract" or "edit"
    user_message: str
    current_complaint: Optional[dict]
    result_fields: dict
    reply: str


# ---------- Prompts ----------

EXTRACT_PROMPT = """You are an AI assistant for a pharmaceutical Quality Management System (QMS).
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

EDIT_PROMPT = """You are an AI assistant for a pharmaceutical Quality Management System (QMS).
The user is correcting or updating a complaint that has already been logged. You will be given the CURRENT complaint data and a correction message.

Respond with ONLY valid JSON containing ONLY the fields that need to change based on the correction message. Do NOT include fields that weren't mentioned in the correction. Do NOT include unchanged fields.

Possible keys you may include (only if mentioned): complaint_source, customer_name, product_name, product_strength, batch_lot_number, affected_quantity, manufacturing_date, expiry_date, originating_site_block, impacted_npm, complaint_category, complaint_description, severity, suggested_next_action, initial_risk_assessment

If the correction changes something that would affect risk assessment (e.g. quantity, product, defect type), you may also update severity, suggested_next_action, or initial_risk_assessment using your reasoning.
"""

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


# ---------- Graph nodes ----------

def router_node(state: ComplaintAgentState) -> ComplaintAgentState:
    # Decides which path to take next. LangGraph conditional edges read this key.
    if state["current_complaint"] and state["current_complaint"].get("product_name"):
        state["mode"] = "edit"
    else:
        state["mode"] = "extract"
    return state


def extract_node(state: ComplaintAgentState) -> ComplaintAgentState:
    response = extraction_llm.invoke([
        {"role": "system", "content": EXTRACT_PROMPT},
        {"role": "user", "content": state["user_message"]},
    ])
    state["result_fields"] = json.loads(response.content)
    return state


def edit_node(state: ComplaintAgentState) -> ComplaintAgentState:
    context = (
        f"CURRENT COMPLAINT DATA:\n{json.dumps(state['current_complaint'], indent=2)}\n\n"
        f"CORRECTION MESSAGE:\n{state['user_message']}"
    )
    response = extraction_llm.invoke([
        {"role": "system", "content": EDIT_PROMPT},
        {"role": "user", "content": context},
    ])
    state["result_fields"] = json.loads(response.content)
    return state


def format_reply_node(state: ComplaintAgentState) -> ComplaintAgentState:
    if state["mode"] == "extract":
        state["reply"] = "Complaint parsed successfully. I've extracted the product details and generated an initial risk assessment."
    else:
        state["reply"] = "Got it. I've updated the form based on your correction."
    return state


def route_decision(state: ComplaintAgentState) -> str:
    return state["mode"]


# ---------- Build the graph ----------

graph_builder = StateGraph(ComplaintAgentState)

graph_builder.add_node("router", router_node)
graph_builder.add_node("extract_node", extract_node)
graph_builder.add_node("edit_node", edit_node)
graph_builder.add_node("format_reply", format_reply_node)

graph_builder.set_entry_point("router")

graph_builder.add_conditional_edges(
    "router",
    route_decision,
    {
        "extract": "extract_node",
        "edit": "edit_node",
    },
)

graph_builder.add_edge("extract_node", "format_reply")
graph_builder.add_edge("edit_node", "format_reply")
graph_builder.add_edge("format_reply", END)

complaint_agent_graph = graph_builder.compile()


# ---------- Public functions used by main.py ----------

def extract_complaint_fields(user_message: str) -> dict:
    """Used directly for document extraction (PDF text), which always treats content as a fresh complaint."""
    result = complaint_agent_graph.invoke({
        "mode": "extract",
        "user_message": user_message,
        "current_complaint": None,
        "result_fields": {},
        "reply": "",
    })
    return result["result_fields"]


def run_complaint_agent(user_message: str, current_complaint: Optional[dict]) -> dict:
    """Main entry point — lets the graph's router decide extract vs edit."""
    result = complaint_agent_graph.invoke({
        "mode": "",
        "user_message": user_message,
        "current_complaint": current_complaint,
        "result_fields": {},
        "reply": "",
    })
    return {"reply": result["reply"], "fields": result["result_fields"]}


def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(file_bytes))
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text


def check_duplicate(new_complaint: dict, existing_complaints: list) -> dict:
    if not existing_complaints:
        return {"is_duplicate": False, "duplicate_of_id": None, "reason": "No existing complaints to compare."}

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