# Azure Keys CRM

A full-featured real estate CRM platform for Azure Keys Luxury Caribbean Real Estate. Built with Next.js 16, Supabase, and Tailwind CSS. Designed to be deployed on Vercel.

## Features

- **Lead & Contact Management** — Centralized database with lifecycle tracking (Prospect → Client → Retention)
- **Sales Pipeline** — Kanban-style deal management with 8 stages  
- **Property Listings** — Full MLS-style property management with agent assignment & commission tracking
- **Viewing Scheduler** — Book, confirm, and track property viewings
- **Offer Tracking** — Transaction pipeline from draft through closing
- **Task Management** — Team workflow with assignments and due dates
- **Email/SMS Campaigns** — Marketing campaign creation and performance tracking
- **Reports & KPIs** — Revenue trends, pipeline analytics, agent performance dashboards
- **Role-Based Access** — Admin / Manager / Agent / Viewer permissions
- **Activity Timeline** — Full audit trail of all CRM actions

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, Custom CSS Variables |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Charts | Recharts |
| Icons | Lucide React |
| Hosting | Vercel |

---

## Deployment Guide

### Step 1: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) → New Project
2. In **SQL Editor**, run the full contents of `supabase-schema.sql`
   - This creates all 10 tables, Row Level Security policies, triggers, and sample data
3. Go to **Settings → API** and copy:
   - `Project URL` → used as `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → used as `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 2: Deploy to Vercel

**Via GitHub (recommended):**
1. Push this project to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. During setup, click **Environment Variables** and add:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://xxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6...
   ```
4. Click **Deploy**

**Via Vercel CLI:**
```bash
npm i -g vercel
vercel
# Follow prompts, add env vars when asked
```

### Step 3: Configure Auth Redirect URLs

In Supabase Dashboard → **Authentication → URL Configuration**:
- Set **Site URL** to your Vercel URL: `https://your-app.vercel.app`
- Add to **Redirect URLs**: `https://your-app.vercel.app/**`

### Step 4: Create Your First Admin Account

1. Visit `https://your-app.vercel.app/login`
2. Click "Sign Up" and create your account
3. In Supabase → **Table Editor → profiles**, find your user and set `role` to `admin`

---

## Local Development

```bash
npm install
cp .env.example .env.local   # Add your Supabase credentials
npm run dev
# Open http://localhost:3000
```

`.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Database Schema (10 Tables)

| Table | Purpose |
|-------|---------|
| `profiles` | Agent/user accounts — extends Supabase auth |
| `contacts` | Leads, prospects, clients, vendors |
| `properties` | Property listings |
| `deals` | Sales pipeline / deal tracking |
| `viewings` | Property viewing appointments |
| `offers` | Purchase offers and transactions |
| `tasks` | Team task management |
| `activities` | Activity/audit timeline log |
| `campaigns` | Email/SMS marketing campaigns |
| `documents` | File metadata (use Supabase Storage for files) |

---

## User Roles

| Role | Description |
|------|-------------|
| `admin` | Full access to all modules and settings |
| `manager` | Full access, manages team |
| `agent` | Access to own contacts, deals, properties |
| `viewer` | Read-only access |

---

## CRM Modules

| Module | Key Features |
|--------|-------------|
| Dashboard | KPI cards, revenue chart, pipeline donut, viewings widget, activity feed |
| Contacts | Search/filter, lifecycle stages, lead scoring, source attribution, agent assignment |
| Pipeline | Kanban board (8 stages), deal value, probability, commission tracking |
| Properties | Listings, status management, agent/seller linking, features & amenities |
| Viewings | Schedule viewings, in-person/virtual, post-viewing feedback & ratings |
| Offers | Full offer lifecycle, counter offers, contingencies, closing dates |
| Tasks | Assign to agents, priority levels, link to deals/contacts/properties |
| Campaigns | Email/SMS campaigns, open/click tracking, target audience |
| Reports | Revenue trends, pipeline funnel, source breakdown, property performance |

---

## Design System

Matches the Azure Keys website brand identity:

- **Fonts**: Cormorant Garamond (headings) + Jost (UI text)
- **Colors**: Navy `#0a1628` · Gold `#c9a84c` · Azure `#1e7ec8`
- **Style**: Luxury dark theme with gold accents

---

*Built by Kromium Digital · Azure Keys Luxury Caribbean Real Estate · Barbados*
