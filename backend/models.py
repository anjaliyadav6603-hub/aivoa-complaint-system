from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    complaint_source = Column(Text, nullable=True)
    customer_name = Column(Text, nullable=True)
    customer_phone = Column(Text, nullable=True, index=True)
    product_name = Column(Text, nullable=True)
    product_strength = Column(Text, nullable=True)
    batch_lot_number = Column(Text, nullable=True)
    affected_quantity = Column(Text, nullable=True)
    manufacturing_date = Column(Text, nullable=True)
    expiry_date = Column(Text, nullable=True)
    originating_site_block = Column(Text, nullable=True)
    impacted_npm = Column(Text, nullable=True)
    complaint_category = Column(Text, nullable=True)
    complaint_description = Column(Text, nullable=True)
    severity = Column(Text, nullable=True)
    suggested_next_action = Column(Text, nullable=True)
    initial_risk_assessment = Column(Text, nullable=True)
    status = Column(Text, default="Pending Triage")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"))
    file_path = Column(Text)
    file_type = Column(Text)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=True)
    role = Column(Text)  # "user" or "assistant"
    message_text = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"))
    old_status = Column(Text, nullable=True)
    new_status = Column(Text)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())