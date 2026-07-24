from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
import models, schemas
from database import engine, get_db
from ai_agent import extract_complaint_fields

# This creates all tables in Postgres if they don't exist yet
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

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