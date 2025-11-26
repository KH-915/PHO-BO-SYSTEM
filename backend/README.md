# PHO-BO Backend (FastAPI + MySQL)

FastAPI service that mirrors the entities in `Structure of the Data Requirements (GPT) - Entity (1).csv` with basic CRUD endpoints for each table.

## Setup

1. Create a database (example):  
   ```sql
   CREATE DATABASE phobo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. Configure the connection string in `backend/.env` (or environment):  
   ```
   DATABASE_URL="mysql+pymysql://root:password@localhost:3306/phobo"
   ```
   (See `.env.example` for a ready-to-copy template.)
3. Install dependencies and run the API:  
   ```bash
   cd backend
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```

Example one-liner to run (after activating the venv and setting `.env`):  
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Seed sample data
```bash
cd backend
python -m app.seed_data
```
This now seeds at least 7 records per table with linked users, pages, groups, posts/files/comments/reactions, events, and reports.  
To clear all seeded rows:
```bash
python -m app.seed_data --clear
```

## Quick endpoints to try (with the seed data)
- `GET /users` — list seeded users.
- `GET /posts` — see the sample post.
- `GET /comments` — view the comment added to the post.
- `GET /groups` and `GET /group-memberships` — verify group membership.
- `GET /events` and `GET /event-participants` — seeded event and RSVP.
- `GET /reports` and `GET /report-actions` — sample report and action.

Example create call (make sure foreign keys exist):  
```bash
curl -X POST http://localhost:8000/posts \
  -H "Content-Type: application/json" \
  -d '{"author_id":1,"author_type":"USER","text_content":"Hello API","privacy_setting":"PUBLIC"}'
```

Tables are auto-created at startup from the SQLAlchemy models. The OpenAPI docs are available at `http://localhost:8000/docs` and every entity exposes standard CRUD routes (POST/GET/PUT/DELETE) under intuitive prefixes (e.g., `/users`, `/posts`, `/group-memberships/{user_id}/{group_id}`).
