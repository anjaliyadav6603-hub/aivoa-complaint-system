from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
import models, schemas
from database import engine, get_db
from ai_agent import extract_complaint_fields, edit_complaint_fields, extract_text_from_pdf
from ai_agent import extract_complaint_fields
from fastapi import UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from ai_agent import extract_complaint_fields, edit_complaint_fields
# This creates all tables in Postgres if they don't exist yet
models.Base.metadata.create_all(bind=engine)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "backend is running"}

@app.post("/complaints", response_model=schemas.ComplaintResponse)
def create_complaint(complaint: schemas.ComplaintCreate, db: Session = Depends(get_db)):
    new_complaint = models.Complaint(**complaint.dict())
    db.add(new_complaint)
    db.commit()
    db.refresh(new_complaint)
    return new_complaint

@app.get("/complaints", response_model=list[schemas.ComplaintResponse])
def list_complaints(db: Session = Depends(get_db)):
    return db.query(models.Complaint).all()

@app.get("/complaints/{complaint_id}", response_model=schemas.ComplaintResponse)
def get_complaint(complaint_id: int, db: Session = Depends(get_db)):
    return db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
from fastapi import FastAPI, Depends, HTTPException

@app.patch("/complaints/{complaint_id}", response_model=schemas.ComplaintResponse)
def update_complaint(complaint_id: int, updates: schemas.ComplaintUpdate, db: Session = Depends(get_db)):
    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    update_data = updates.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(complaint, field, value)

    db.commit()
    db.refresh(complaint)
    return complaint
from pydantic import BaseModel

class ChatMessageInput(BaseModel):
    message: str

@app.post("/copilot/log-complaint")
def log_complaint(input: ChatMessageInput):
    extracted_fields = extract_complaint_fields(input.message)
    return {
        "reply": "Complaint parsed successfully. I've extracted the product details and generated an initial risk assessment.",
        "fields": extracted_fields,
    }
class EditMessageInput(BaseModel):
    message: str
    current_complaint: dict

@app.post("/copilot/edit-complaint")
def edit_complaint(input: EditMessageInput):
    updated_fields = edit_complaint_fields(input.current_complaint, input.message)
    return {
        "reply": f"Got it. I've updated the form based on your correction.",
        "fields": updated_fields,
    }
@app.post("/copilot/upload-document")
async def upload_document(file: UploadFile = File(...)):
    file_bytes = await file.read()
    extracted_text = extract_text_from_pdf(file_bytes)
    extracted_fields = extract_complaint_fields(extracted_text)
    return {
        "reply": f"PDF analysis complete. I've successfully extracted the complaint report and populated the form.",
        "fields": extracted_fields,
    }