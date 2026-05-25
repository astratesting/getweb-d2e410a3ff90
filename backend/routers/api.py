import uuid
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Lead, LeadStatus, ScrapeJob, User
from backend.routers.auth import get_current_user
from backend.services.core import CoreService

router = APIRouter()


class ScrapeRequest(BaseModel):
    query: str
    location: str


class ScrapeJobResponse(BaseModel):
    id: str
    query: str
    location: str
    status: str
    leads_found: int
    created_at: datetime

    class Config:
        from_attributes = True


class LeadResponse(BaseModel):
    id: str
    business_name: str
    category: Optional[str]
    address: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    rating: Optional[float]
    review_count: Optional[int]
    status: str
    preview_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class GeneratePageRequest(BaseModel):
    lead_id: str


class SendEmailRequest(BaseModel):
    lead_id: str


class DashboardStats(BaseModel):
    total_leads: int
    pages_generated: int
    emails_sent: int
    conversions: int


@router.post("/scrape", response_model=ScrapeJobResponse)
async def start_scrape(
    req: ScrapeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = ScrapeJob(
        owner_id=current_user.id,
        query=req.query,
        location=req.location,
        status="running",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    service = CoreService(db)
    background_tasks.add_task(service.run_scrape_job, str(job.id), current_user.id)

    return job


@router.get("/scrape/{job_id}", response_model=ScrapeJobResponse)
def get_scrape_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = db.query(ScrapeJob).filter(
        ScrapeJob.id == job_id,
        ScrapeJob.owner_id == current_user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/leads", response_model=List[LeadResponse])
def list_leads(
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Lead).filter(Lead.owner_id == current_user.id)
    if status:
        q = q.filter(Lead.status == status)
    return q.order_by(Lead.created_at.desc()).offset(skip).limit(limit).all()


@router.post("/leads/{lead_id}/generate-page", response_model=LeadResponse)
async def generate_page(
    lead_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.owner_id == current_user.id,
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    service = CoreService(db)
    background_tasks.add_task(service.generate_landing_page, lead_id)

    lead.status = LeadStatus.page_generated
    db.commit()
    db.refresh(lead)
    return lead


@router.post("/leads/{lead_id}/send-email", response_model=LeadResponse)
async def send_email(
    lead_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.owner_id == current_user.id,
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if not lead.generated_page_html:
        raise HTTPException(status_code=400, detail="Generate landing page first")
    if not lead.email:
        raise HTTPException(status_code=400, detail="No email address for this lead")

    service = CoreService(db)
    background_tasks.add_task(service.send_preview_email, lead_id)

    return lead


@router.get("/preview/{token}")
def view_preview(token: str, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.preview_token == token).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Preview not found")

    if not lead.email_opened_at:
        lead.email_opened_at = datetime.utcnow()
        lead.status = LeadStatus.opened
        db.commit()

    return {"html": lead.generated_page_html, "business_name": lead.business_name}


@router.get("/stats", response_model=DashboardStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base = db.query(Lead).filter(Lead.owner_id == current_user.id)
    return DashboardStats(
        total_leads=base.count(),
        pages_generated=base.filter(Lead.generated_page_html.isnot(None)).count(),
        emails_sent=base.filter(Lead.email_sent_at.isnot(None)).count(),
        conversions=base.filter(Lead.status == LeadStatus.converted).count(),
    )
