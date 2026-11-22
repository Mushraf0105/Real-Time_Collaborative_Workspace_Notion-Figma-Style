# SyncSpace Deployment & Operations Guide

This comprehensive guide covers step-by-step deployment procedures for **SyncSpace** across Cloud PaaS (Vercel, Railway, Render, Supabase), Docker Compose on VPS (AWS EC2, DigitalOcean, Linode), and bare-metal Ubuntu servers using PM2 and Nginx.

---

## 🏗️ Architecture Components Summary

SyncSpace consists of three core runtime tiers:
1. **Frontend:** Next.js 14 Web Application (Port `3000`)
2. **Backend Services:**
   - **REST API:** Express.js HTTP Server (Port `5001`)
   - **CRDT WebSocket Gateway:** `y-websocket` binary server (Port `1234`)
3. **Data Layer:**
   - **Relational Database:** PostgreSQL 16 (or SQLite for single-instance local deployments) via Prisma ORM
   - **Redis (Optional / Multi-Node):** Pub/Sub clustering bus on port `6379` (falls back to in-memory event bus if absent)

---

## 🚀 Deployment Method 1: Cloud PaaS (Recommended & Easiest)

This approach is free/low-cost, requires zero server maintenance, and provides automatic SSL certificates.

### Overview:
- **Frontend:** [Vercel](https://vercel.com) (Native Next.js hosting, free tier)
- **Backend & WebSockets:** [Railway](https://railway.app) or [Render](https://render.com) (Persistent container supporting WebSockets)
- **Database:** [Supabase](https://supabase.com) or [Neon](https://neon.tech) (Free managed PostgreSQL)
- **Redis (Optional):** [Upstash](https://upstash.com) (Free serverless Redis)

---

### Step 1: Provision PostgreSQL on Supabase or Neon
1. Create a free project at [Supabase](https://supabase.com) or [Neon](https://neon.tech).
2. Copy your PostgreSQL connection string:
   ```text
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
   ```

---

### Step 2: Deploy the Backend to Railway
Railway supports continuous WebSocket connections on custom ports:

1. Go to [Railway](https://railway.app) and click **New Project** > **Deploy from GitHub repo**.
2. Select your repository: `Mushraf0105/Real-Time_Collaborative_Workspace_Notion-Figma-Style`.
3. In **Settings**:
   - **Root Directory:** `/backend`
   - **Build Command:** `npm ci && npx prisma generate`
   - **Start Command:** `node src/server.js`
4. In **Variables**, add:
   ```env
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
   PORT=5001
   WS_PORT=1234
   NODE_ENV=production
   JWT_SECRET=your-super-secure-production-secret-key-32-chars
   ```
5. Railway will automatically generate a public domain (e.g. `https://syncspace-backend.up.railway.app`).
   - REST API URL: `https://syncspace-backend.up.railway.app/api`
   - WebSocket URL: `wss://syncspace-backend.up.railway.app`

---

### Step 3: Deploy the Frontend to Vercel
1. Go to [Vercel](https://vercel.com) and click **Add New Project**.
2. Import your GitHub repository.
3. Configure the project:
   - **Root Directory:** Click *Edit* and select `frontend`.
   - **Framework Preset:** Next.js
4. Add **Environment Variables**:
   ```env
   NEXT_PUBLIC_API_URL=https://syncspace-backend.up.railway.app/api
   NEXT_PUBLIC_WS_URL=wss://syncspace-backend.up.railway.app
   ```
5. Click **Deploy**. Vercel will build the frontend and provide your live production URL (e.g., `https://syncspace.vercel.app`).

---

## 🐳 Deployment Method 2: Docker Compose (All-in-One VPS)

Deploy the entire stack (PostgreSQL, Redis, Backend, Frontend) with a single command on any VPS (AWS EC2, DigitalOcean, Hetzner, Linode).

### Step 1: Provision a Linux Server
- Recommended: Ubuntu 22.04 LTS or 24.04 LTS (minimum 2 vCPU, 2GB–4GB RAM).
- Connect via SSH:
  ```bash
  ssh root@your-server-ip
  ```

### Step 2: Install Docker & Docker Compose
```bash
# Update packages and install Docker
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Verify installation
docker --version
docker compose version
```

### Step 3: Clone & Configure
```bash
# Clone the repository
git clone https://github.com/Mushraf0105/Real-Time_Collaborative_Workspace_Notion-Figma-Style.git
cd Real-Time_Collaborative_Workspace_Notion-Figma-Style

# (Optional) Verify or customize passwords in docker-compose.yml
```

### Step 4: Launch All Containers
```bash
# Build and start all 4 services in the background
docker compose up --build -d

# Check running containers
docker compose ps
```

You should see:
- `syncspace-postgres` on port `5432` (Healthy)
- `syncspace-redis` on port `6379` (Healthy)
- `syncspace-backend` on ports `5001` (REST) & `1234` (WS)
- `syncspace-frontend` on port `3000` (Next.js)

---

### Step 5: Configure Nginx & SSL (Certbot)
To serve SyncSpace over HTTPS and secure WebSockets (`wss://`):

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Create an Nginx configuration file:
```bash
sudo nano /etc/nginx/sites-available/syncspace
```

Paste the following configuration (replace `yourdomain.com` with your domain):
```nginx
server {
    server_name yourdomain.com;

    # 1. Frontend Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 2. Backend REST API
    location /api/ {
        proxy_pass http://localhost:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 3. y-websocket CRDT Gateway
    location /ws/ {
        proxy_pass http://localhost:1234/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Enable the site and obtain a free SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/syncspace /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Generate SSL certificate
sudo certbot --nginx -d yourdomain.com
```

---

## 🖥️ Deployment Method 3: Direct VPS Deployment with PM2

If you prefer running directly on a Linux VPS without Docker:

### Step 1: Install Node.js 20+ and PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### Step 2: Install Dependencies & Run Migrations
```bash
cd /var/www/SyncSpace

# Backend Setup
cd backend
npm install
npx prisma generate
npx prisma db push
npm run seed

# Frontend Setup
cd ../frontend
npm install
npm run build
```

### Step 3: Manage with PM2
```bash
# Start backend
cd /var/www/SyncSpace/backend
pm2 start src/server.js --name "syncspace-backend"

# Start frontend
cd /var/www/SyncSpace/frontend
pm2 start npm --name "syncspace-frontend" -- start

# Save PM2 process list across reboots
pm2 save
pm2 startup
```

---

## 🔍 Monitoring & Health Verification

SyncSpace exposes a real-time health telemetry endpoint to verify system status and Redis clustering:

```bash
curl http://localhost:5001/api/health
```

Expected Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-11-22T10:00:00.000Z",
  "uptime": 1420.5,
  "activeCRDTDocuments": 3,
  "redisClustering": "connected"
}
```

---

## 🔒 Security Best Practices for Production

1. **Environment Secrets:** Always set a unique, cryptographically random `JWT_SECRET` (at least 32 characters).
2. **Database Backups:** Set up automated daily snapshots on Supabase, AWS RDS, or using a pg_dump cron job.
3. **CORS Whitelist:** In `backend/src/server.js`, configure `cors` to explicitly whitelist your production frontend domain:
   ```javascript
   app.use(cors({ origin: ['https://yourdomain.com'] }));
   ```
4. **WebSocket Timeouts:** In your reverse proxy (Nginx or Cloudflare), set `proxy_read_timeout` and `proxy_send_timeout` to `86400s` to prevent idle collaborative sessions from dropping prematurely.

