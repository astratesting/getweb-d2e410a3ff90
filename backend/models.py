import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey,
    Integer, String, Text, Float
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from backend.database import Base


class UserPlan(str, enum.Enum):
    free = "free"
    starter = "starter"
    pro = "pro"


class LeadStatus(str, enum.Enum):
    discovered = "discovered"
    page_generated = "page_generated"
    email_sent = "email_sent"
    opened = "opened"
    converted = "converted"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    plan = Column(Enum(UserPlan), default=UserPlan.free, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    leads = relationship("Lead", back_populates="owner")
    scrape_jobs = relationship("ScrapeJob", back_populates="owner")


class ScrapeJob(Base):
    __tablename__ = "scrape_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    query = Column(String(500), nullable=False)
    location = Column(String(255), nullable=False)
    status = Column(String(50), default="pending")
    leads_found = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    owner = relationship("User", back_populates="scrape_jobs")
    leads = relationship("Lead", back_populates="scrape_job")


class Lead(Base):
    __tablename__ = "leads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    scrape_job_id = Column(UUID(as_uuid=True), ForeignKey("scrape_jobs.id"), nullable=True)

    business_name = Column(String(500), nullable=False)
    category = Column(String(255))
    address = Column(Text)
    phone = Column(String(50))
    email = Column(String(255))
    google_maps_url = Column(Text)
    google_place_id = Column(String(255), unique=True, index=True)
    rating = Column(Float)
    review_count = Column(Integer)
    has_website = Column(Boolean, default=False)

    status = Column(Enum(LeadStatus), default=LeadStatus.discovered)
    preview_token = Column(String(255), unique=True, index=True)
    preview_url = Column(Text)
    generated_page_html = Column(Text)

    email_sent_at = Column(DateTime, nullable=True)
    email_opened_at = Column(DateTime, nullable=True)
    converted_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="leads")
    scrape_job = relationship("ScrapeJob", back_populates="leads")
