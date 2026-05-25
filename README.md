# GetWeb

Find local businesses without websites, generate AI landing pages, email free previews.

## Stack

- **Backend**: FastAPI + PostgreSQL + SQLAlchemy
- **Frontend**: Next.js 14 + TypeScript + Tailwind
- **AI**: Anthropic Claude (page generation)
- **Scraping**: Google Maps Places API
- **Auth**: JWT (bcrypt + python-jose)

## Quick Start

```bash
cp .env.example .env
# Fill in SECRET_KEY, ANTHROPIC_API_KEY, GOOGLE_MAPS_API_KEY, SMTP_*

docker compose up
```

- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- Frontend: http://localhost:3000

## Local Dev (no Docker)

**Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Get JWT token |
| GET | `/auth/me` | Current user |
| POST | `/api/scrape` | Start Google Maps scrape job |
| GET | `/api/scrape/{id}` | Poll scrape job status |
| GET | `/api/leads` | List leads |
| POST | `/api/leads/{id}/generate-page` | Generate AI landing page |
| POST | `/api/leads/{id}/send-email` | Email preview to owner |
| GET | `/api/preview/{token}` | Public preview endpoint |
| GET | `/api/stats` | Dashboard stats |

## Architecture

```
google-maps-api → ScrapeJob → Lead[] (no website filter)
                                  ↓
                          Claude API → HTML landing page
                                  ↓
                          SMTP → owner email w/ preview link
                                  ↓
                          Lead.status: discovered → page_generated → email_sent → opened → converted
```

## Key Env Vars

| Var | Required | Notes |
|-----|----------|-------|
| `SECRET_KEY` | Yes | 256-bit random hex |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | No | Falls back to mock HTML |
| `GOOGLE_MAPS_API_KEY` | No | Falls back to mock businesses |
| `SMTP_USER` + `SMTP_PASSWORD` | No | Falls back to no-op send |
