# AI-Driven Support Ticket Triage Agent & SaaS Platform

An intelligent, multi-tenant customer support ticket management system powered by AI agents. The application automatically ingests support requests, summarizes technical issue descriptions, rates ticket priorities, identifies required technical skill tags, and routes them to the best-matching team members based on a custom scoring algorithm.

---

## 🚀 Key Features

* **🤖 AI Triage Agent**: Integrates with LLMs (Groq's `llama-3.3-70b-versatile` via `@inngest/agent-kit`) to parse ticket contents, generate actionable summaries, rate priorities (low/medium/high), and identify required technical skills.
* **🎯 Fuzzy Skill-Matching Router**: Automatically matches ticket-required skills against team member skill arrays using a case-insensitive, punctuation-resistant prefix and substring scoring model (assigning tickets to the user with the highest match score, falling back to organization admins).
* **⛓️ Dual Event Orchestration & Fallback**: Leverages asynchronous queues (Inngest) for background workflows. Features a direct Express process fallback trigger to guarantee real-time ticket triage even when event servers are offline.
* **🏢 Multi-Tenant Workspace & Teams**: Fully functional organization creation, secure stateless JWT-based invitations bound to target emails, role changes (promotions), custom team skills tagging, and administrator transfer swaps.
* **🔒 Passwordless Verification & Security**: Bulletproof email verification alerts with resend capability, secure JWT authentication with cookies, password hashing with bcrypt, and validation routing.
* **🎨 Sleek Glassmorphic Dark UI**: Premium user interface built with dark default themes, gradient components, hover micro-animations, and interactive modals.

---

## 🛠️ Tech Stack

* **Frontend**: React 18, Vite, Vanilla CSS + Tailwind, Lucide React (Icons), Axios, React Router Dom.
* **Backend**: Node.js, Express, Prisma ORM, PostgreSQL, Inngest SDK, Mailgen, Nodemailer (Mailtrap/SMTP integrations).
* **Database**: PostgreSQL (Prisma Client).

---

## 📐 System Architecture

```mermaid
graph TD
    Client[React Frontend] -->|REST API Requests| API[Express API Server]
    API -->|Read/Write Operations| DB[(PostgreSQL Database)]
    API -->|Send event| EventBus[Inngest Event Server]
    API -->|Fallback Direct Trigger| Worker[Direct Background Process]
    EventBus -->|Invoke Function| Worker
    Worker -->|1. Request AI Analysis| AI[AI Agent Groq Llama-3.3]
    Worker -->|2. Score & Match Assignee| Match[Fuzzy Skill Matcher]
    Worker -->|3. Record Assignment| DB
    Worker -->|4. Dispatch Notification| Mailer[Nodemailer & Mailgen]
```

---

## ⚙️ Project Setup

### 1. Prerequisites
Ensure you have **Node.js** (v18+) and **PostgreSQL** installed.

### 2. Backend Environment Variables
Create a `.env` file in the `/backend` folder:
```env
PORT=3000
DATABASE_URL="postgresql://username:password@localhost:5432/triage_db?schema=public"

# Auth Secrets
ACCESS_TOKEN_SECRET="your_access_token_secret"
ACCESS_TOKEN_EXPIRY="1d"
REFRESH_TOKEN_SECRET="your_refresh_token_secret"
REFRESH_TOKEN_EXPIRY="10d"

# CORS & Urls
FRONTEND_URL="http://localhost:5173"
CORS_ORIGIN="http://localhost:5173"

# AI Configuration
GROQ_API_KEY="your_groq_api_key"

# Email Configuration (e.g. Mailtrap or Gmail)
EMAIL_HOST="sandbox.smtp.mailtrap.io"
EMAIL_PORT=2525
EMAIL_USER="your_smtp_username"
EMAIL_PASS="your_smtp_password"
EMAIL_FROM="no-reply@aitriage.com"
```

### 3. Frontend Environment Variables
Create a `.env` file in the `/frontend` folder:
```env
VITE_API_URL="http://localhost:3000/api/v1"
```

### 4. Running Locally

#### Step A: Database Migration
Navigate to `/backend` and execute:
```bash
npm install
npx prisma db push
```

#### Step B: Start Backend API
```bash
npm run dev
```

#### Step C: Start Frontend App
Navigate to `/frontend` and execute:
```bash
npm install
npm run dev
```

*(Optional)* **Step D: Start Inngest Dev Server**
If you wish to test through the Inngest local orchestrator, execute in the backend directory:
```bash
npm run inngest
```

---

## 📁 Repository Structure

```text
├── backend
│   ├── prisma             # Prisma schema & migrations
│   ├── src
│   │   ├── controllers    # Request handler logic
│   │   ├── database       # Prisma Client DB initialization
│   │   ├── inngest        # Async events & background workers
│   │   ├── middlewares    # JWT auth and file validation filters
│   │   ├── routes         # API routing declarations
│   │   ├── utils          # AI client, email engines, and fuzzy matcher
│   │   └── app.js         # Main express app initialization
│   └── index.js           # Server startup script
└── frontend
    └── src
        ├── api            # Client-side API request services
        ├── components     # Reusable layout fragments & navbars
        ├── context        # Auth state management providers
        └── pages          # Router views (Dashboard, Org Settings, Ticket Details)
```

---

## 📈 Git Push Instructions

To push this repository to GitHub cleanly:

1. **Verify `.gitignore` files exist** in both `/backend` and `/frontend` folders to make sure your private keys and libraries are never uploaded:
   - Check that `node_modules` and `.env` are listed inside your `.gitignore`.
2. **Initialize Git** in the workspace root:
   ```bash
   git init
   ```
3. **Stage all changes**:
   ```bash
   git add .
   ```
4. **Commit**:
   ```bash
   git commit -m "feat: complete AI Ticket Triage SaaS workspace and routing"
   ```
5. **Create GitHub Repo & Push**:
   Create a new blank repository on GitHub, then link and push:
   ```bash
   git remote add origin https://github.com/your-username/your-repo-name.git
   git branch -M main
   git push -u origin main
   ```
