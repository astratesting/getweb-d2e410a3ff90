import os
import secrets
import smtplib
import uuid
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Optional

import anthropic
import httpx
from sqlalchemy.orm import Session

from backend.models import Lead, LeadStatus, ScrapeJob

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:8000")


class CoreService:
    def __init__(self, db: Session):
        self.db = db

    async def run_scrape_job(self, job_id: str, owner_id: uuid.UUID):
        job = self.db.query(ScrapeJob).filter(ScrapeJob.id == job_id).first()
        if not job:
            return

        try:
            businesses = await self._search_google_maps(job.query, job.location)
            no_website = [b for b in businesses if not b.get("website")]

            for biz in no_website:
                existing = self.db.query(Lead).filter(
                    Lead.google_place_id == biz.get("place_id")
                ).first()
                if existing:
                    continue

                lead = Lead(
                    owner_id=owner_id,
                    scrape_job_id=job.id,
                    business_name=biz.get("name", ""),
                    category=biz.get("types", [""])[0] if biz.get("types") else None,
                    address=biz.get("formatted_address"),
                    phone=biz.get("formatted_phone_number"),
                    google_place_id=biz.get("place_id"),
                    google_maps_url=f"https://maps.google.com/?cid={biz.get('place_id')}",
                    rating=biz.get("rating"),
                    review_count=biz.get("user_ratings_total"),
                    has_website=False,
                    preview_token=secrets.token_urlsafe(32),
                )
                self.db.add(lead)

            job.leads_found = len(no_website)
            job.status = "completed"
            job.completed_at = datetime.utcnow()
            self.db.commit()

        except Exception as e:
            job.status = "failed"
            self.db.commit()
            raise e

    async def _search_google_maps(self, query: str, location: str) -> List[dict]:
        if not GOOGLE_MAPS_API_KEY:
            return self._mock_businesses(query, location)

        async with httpx.AsyncClient() as client:
            search_url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
            params = {
                "query": f"{query} in {location}",
                "key": GOOGLE_MAPS_API_KEY,
            }
            resp = await client.get(search_url, params=params)
            data = resp.json()
            places = data.get("results", [])

            detailed = []
            for place in places[:20]:
                detail_resp = await client.get(
                    "https://maps.googleapis.com/maps/api/place/details/json",
                    params={
                        "place_id": place["place_id"],
                        "fields": "name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,types,place_id",
                        "key": GOOGLE_MAPS_API_KEY,
                    },
                )
                detail = detail_resp.json().get("result", {})
                detailed.append(detail)

            return detailed

    def _mock_businesses(self, query: str, location: str) -> List[dict]:
        return [
            {
                "name": f"Smith's {query.title()} Services",
                "place_id": f"mock_{uuid.uuid4().hex[:8]}",
                "formatted_address": f"123 Main St, {location}",
                "formatted_phone_number": "(555) 100-0001",
                "types": [query.lower().replace(" ", "_")],
                "rating": 4.2,
                "user_ratings_total": 47,
            },
            {
                "name": f"Joe's {query.title()} Co",
                "place_id": f"mock_{uuid.uuid4().hex[:8]}",
                "formatted_address": f"456 Oak Ave, {location}",
                "formatted_phone_number": "(555) 100-0002",
                "types": [query.lower().replace(" ", "_")],
                "rating": 4.7,
                "user_ratings_total": 128,
            },
            {
                "name": f"{location} {query.title()} Pros",
                "place_id": f"mock_{uuid.uuid4().hex[:8]}",
                "formatted_address": f"789 Elm Blvd, {location}",
                "formatted_phone_number": "(555) 100-0003",
                "types": [query.lower().replace(" ", "_")],
                "rating": 3.9,
                "user_ratings_total": 22,
            },
        ]

    async def generate_landing_page(self, lead_id: str):
        lead = self.db.query(Lead).filter(Lead.id == lead_id).first()
        if not lead:
            return

        html = await self._call_claude_for_page(lead)
        lead.generated_page_html = html
        lead.preview_url = f"{APP_BASE_URL}/api/preview/{lead.preview_token}"
        lead.status = LeadStatus.page_generated
        self.db.commit()

    async def _call_claude_for_page(self, lead: Lead) -> str:
        if not ANTHROPIC_API_KEY:
            return self._mock_landing_page(lead)

        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        prompt = f"""Generate a complete, beautiful, single-file HTML landing page for this local business.

Business: {lead.business_name}
Category: {lead.category or "local business"}
Address: {lead.address or ""}
Phone: {lead.phone or ""}
Rating: {lead.rating or ""} stars ({lead.review_count or 0} reviews)

Requirements:
- Inline all CSS (no external stylesheets except Google Fonts via link tag)
- Modern design with hero section, services, about, contact
- Mobile responsive
- Professional color scheme matching the business type
- Include the phone number prominently with a click-to-call link
- Add a "Claim this page" CTA button (href="#claim")
- Use placeholder images via https://picsum.photos/
- Return ONLY the complete HTML document, nothing else"""

        message = client.messages.create(
            model="claude-opus-4-7",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text

    def _mock_landing_page(self, lead: Lead) -> str:
        name = lead.business_name
        phone = lead.phone or "(555) 000-0000"
        address = lead.address or ""
        category = (lead.category or "local business").replace("_", " ").title()

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{name}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ font-family: 'Inter', sans-serif; color: #1a1a2e; }}
  .hero {{ background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 80px 20px; text-align: center; }}
  .hero h1 {{ font-size: 3rem; font-weight: 700; margin-bottom: 16px; }}
  .hero p {{ font-size: 1.25rem; opacity: 0.85; margin-bottom: 32px; }}
  .btn {{ display: inline-block; background: #e94560; color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 1.1rem; }}
  .btn-outline {{ background: transparent; border: 2px solid white; margin-left: 12px; }}
  section {{ padding: 80px 20px; max-width: 1100px; margin: 0 auto; }}
  h2 {{ font-size: 2rem; margin-bottom: 40px; text-align: center; }}
  .services {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; }}
  .card {{ background: #f8f9fa; border-radius: 12px; padding: 32px; text-align: center; }}
  .card h3 {{ margin-bottom: 12px; font-size: 1.2rem; }}
  .contact {{ background: #1a1a2e; color: white; text-align: center; padding: 80px 20px; }}
  .contact a {{ color: #e94560; font-size: 2rem; font-weight: 700; text-decoration: none; display: block; margin: 16px 0; }}
  footer {{ text-align: center; padding: 24px; font-size: 0.85rem; color: #666; }}
  .claim {{ background: #e94560; color: white; text-align: center; padding: 48px 20px; }}
  .claim h2 {{ color: white; margin-bottom: 16px; }}
</style>
</head>
<body>
<div class="hero">
  <h1>{name}</h1>
  <p>Professional {category} serving your community</p>
  <a href="tel:{phone}" class="btn">Call Now: {phone}</a>
  <a href="#services" class="btn btn-outline">Our Services</a>
</div>
<section id="services">
  <h2>Our Services</h2>
  <div class="services">
    <div class="card">
      <h3>Quality Work</h3>
      <p>We deliver exceptional results with every project, big or small.</p>
    </div>
    <div class="card">
      <h3>Fast Response</h3>
      <p>Same-day service available. We're here when you need us most.</p>
    </div>
    <div class="card">
      <h3>Fair Pricing</h3>
      <p>Transparent, competitive pricing with no hidden fees.</p>
    </div>
  </div>
</section>
<div class="contact">
  <h2>Get In Touch</h2>
  <p>{address}</p>
  <a href="tel:{phone}">{phone}</a>
  <a href="tel:{phone}" class="btn" style="display:inline-block;font-size:1.1rem;">Call Now</a>
</div>
<div class="claim" id="claim">
  <h2>Is this your business?</h2>
  <p>Claim your free website and start attracting more customers today.</p>
  <a href="#" class="btn" style="background:white;color:#e94560;margin-top:16px;display:inline-block;">Claim Your Free Website</a>
</div>
<footer>
  <p>© 2025 {name} · {address}</p>
</footer>
</body>
</html>"""

    async def send_preview_email(self, lead_id: str):
        lead = self.db.query(Lead).filter(Lead.id == lead_id).first()
        if not lead or not lead.email:
            return

        preview_url = lead.preview_url or f"{APP_BASE_URL}/api/preview/{lead.preview_token}"
        subject = f"We built a free website for {lead.business_name}"
        body_html = f"""
<html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2 style="color:#1a1a2e;">Hi there!</h2>
<p>We noticed that <strong>{lead.business_name}</strong> doesn't have a website yet.</p>
<p>We built you a <strong>free professional website</strong> — no strings attached. Click below to see it:</p>
<p style="text-align:center;margin:32px 0;">
  <a href="{preview_url}" style="background:#e94560;color:white;padding:16px 40px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:1.1rem;">
    View Your Free Website
  </a>
</p>
<p>This preview is yours, completely free. If you'd like to publish it with your own domain and make it live, we can help with that too — starting at just $29/month.</p>
<p>No pressure at all. We just thought you deserved a website as great as your business.</p>
<p>— The GetWeb Team</p>
<hr style="margin-top:40px;border:none;border-top:1px solid #eee;">
<p style="font-size:0.8rem;color:#999;">You received this because your business {lead.business_name} appeared in Google Maps.
<a href="#">Unsubscribe</a></p>
</body></html>"""

        if not SMTP_USER:
            lead.email_sent_at = datetime.utcnow()
            lead.status = LeadStatus.email_sent
            self.db.commit()
            return

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_USER
        msg["To"] = lead.email
        msg.attach(MIMEText(body_html, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, lead.email, msg.as_string())

        lead.email_sent_at = datetime.utcnow()
        lead.status = LeadStatus.email_sent
        self.db.commit()
