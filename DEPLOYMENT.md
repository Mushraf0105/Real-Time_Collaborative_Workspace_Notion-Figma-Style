# SyncSpace Deployment & Operations Guide

This guide covers deployment procedures for **SyncSpace** across local environments, Docker Compose, Kubernetes, and Cloud providers (AWS, Railway, Render, DigitalOcean).

---

## 1. Environment Configuration

### Required Environment Variables

#### Backend Server (`backend/.env`):
```env
# Database Connection (PostgreSQL or SQLite)
DATABASE_URL="postgresql://syncspace:syncspace_secure_password_2026@localhost:5432/syncspace_db?schema=public"

# Redis Pub/Sub Replication Bus
REDIS_URL="redis://127.0.0.1:6379"

# Ports
PORT=5001
WS_PORT=1234
NODE_ENV="production"
JWT_SECRET="syncspace-production-secret-key"
```

#### Frontend Next.js Client (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL="http://localhost:5001/api"
NEXT_PUBLIC_WS_URL="ws://localhost:1234"
```

---

## 2. Docker Compose Multi-Container Deployment

The repository includes a production-ready `docker-compose.yml` orchestrating:
- PostgreSQL 16
- Redis 7 Alpine
- Backend WebSocket / CRDT Server
- Frontend Next.js Application

### Launch Commands:
```bash
# Build and start all 4 services in the background
docker-compose up --build -d

# Check running status
docker-compose ps

# View live real-time logs
docker-compose logs -f backend
```

---

## 3. Cloud Deployment Strategy

### Architecture Topology:
- **Web Client (Next.js):** Deployable to **Vercel**, **Railway**, or **AWS ECS / CloudFront**.
- **Real-Time WebSocket Gateway:** Deployable to persistent container instances (**Railway**, **Render**, **Fly.io**, or **AWS ECS Fargate**) with sticky session termination or reverse-proxy routing.
- **Cache & Pub/Sub:** **Upstash Redis** or **AWS ElastiCache (Redis)**.
- **Relational Database:** **Supabase**, **Neon Serverless PostgreSQL**, or **AWS RDS PostgreSQL**.

---

## 4. Monitoring & Telemetry

SyncSpace exposes a dedicated health telemetry endpoint:
```bash
curl http://localhost:5001/api/health
```

Expected Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-11-08T05:00:00.000Z",
  "uptime": 3600.2,
  "activeCRDTDocuments": 3,
  "redisClustering": "connected"
}
```
