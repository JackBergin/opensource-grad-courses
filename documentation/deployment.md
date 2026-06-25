# Self-Hosted Deployment Guide

This platform is designed to be self-hosted on any Linux server or VPS. The stack uses Docker Compose for the application layer and the official Supabase self-host Docker stack for the backend.

## Architecture

```
Internet → nginx (80/443) → Next.js app (3000)
                          → Supabase Kong (8000) → GoTrue / PostgREST / Storage / Realtime
```

## Step 1: Set up the server

Recommended: Ubuntu 22.04+ VPS with ≥ 2 GB RAM, ≥ 20 GB disk.

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt install docker-compose-plugin
```

## Step 2: Deploy Supabase (self-hosted)

Follow the [official Supabase self-hosting guide](https://supabase.com/docs/guides/self-hosting/docker).

In short:
```bash
git clone --depth 1 https://github.com/supabase/supabase supabase-stack
cd supabase-stack/docker
cp .env.example .env
# Edit .env: set POSTGRES_PASSWORD, JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY, SITE_URL
docker compose up -d
```

After startup, your Supabase API will be at `http://<server-ip>:8000`.

Note your `ANON_KEY` and `SERVICE_ROLE_KEY` — you'll need them for the app.

## Step 3: Apply database migrations

From your local machine (with Supabase CLI and the project linked):

```bash
supabase db push --db-url "postgresql://postgres:<password>@<server-ip>:5432/postgres"
```

Or copy migrations to the server and apply with psql:

```bash
psql postgresql://postgres:<password>@<server-ip>:5432/postgres \
  -f supabase/migrations/20260624194804_content_tables.sql
# ... repeat for each migration file in order
```

## Step 4: Seed content

From your local machine (pointing at the remote Supabase):

```bash
cd supabase/scripts

# Point at remote Supabase
NEXT_PUBLIC_SUPABASE_URL=http://<server-ip>:8000 \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
npm run seed:all

# Rebuild and seed local assessments
npm run expand:assessments
npm run seed:assessments
```

## Step 5: Configure the root .env

On the server, create a `.env` at the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://<server-ip>:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

## Step 6: Deploy the application

```bash
git clone <your-repo> mba && cd mba

# Build and start
cd docker
docker compose up -d --build
```

This starts the Next.js app and nginx.

## Step 7: Configure TLS (HTTPS)

Install Certbot:
```bash
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
```

Then uncomment the HTTPS server block in `nginx/conf.d/app.conf` and set your domain name. Reload nginx:

```bash
docker compose exec nginx nginx -s reload
```

## Updating the application

```bash
git pull
cd docker
docker compose up -d --build app
```

## Monitoring

```bash
# View logs
docker compose logs -f app
docker compose logs -f nginx

# Check container status
docker compose ps
```

## Backup

Back up the Supabase Postgres database:
```bash
# From the supabase-stack/docker directory
docker compose exec db pg_dump -U postgres postgres > backup_$(date +%Y%m%d).sql
```

Back up storage files:
```bash
docker compose exec storage ls /var/lib/storage
# Or access the storage bucket directly via supabase storage API
```
