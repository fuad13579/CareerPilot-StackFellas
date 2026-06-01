# CareerPilot by StackFellas

> Your intelligent career planning and job application tracking platform.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-Active-brightgreen.svg)](#)

CareerPilot is a full-stack web application designed to help users manage their career journey, track job applications, and maintain productivity through integrated todo management and deadline tracking.

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Demo Flow](#demo-flow)
- [Available Scripts](#available-scripts)
- [Troubleshooting](#troubleshooting)
- [Future Improvements](#future-improvements)

---

## 🎯 Project Overview

CareerPilot is a career planning platform that empowers job seekers to:

- **Plan their career** with goal-setting and milestone tracking
- **Track job applications** through a visual Kanban board
- **Manage tasks and deadlines** with integrated productivity tools
- **Monitor progress** via an analytics dashboard

### Problem It Solves

Job searching can be overwhelming with multiple applications, interviews, and deadlines to manage. CareerPilot centralizes all career-related activities into one intuitive platform.

### Intended Users

- Job seekers managing multiple applications
- Career changers tracking their transition progress
- Students planning their career milestones
- Professionals managing career development goals

---

## ✨ Features

### 📊 Career Planning

- Create and manage career goals
- Add milestones and track progress
- Visual roadmap of career journey

### 💼 Job Application Tracker

- Visual Kanban board with columns:
  - **Applied** - Applications submitted
  - **Interviewing** - Applications in interview process
  - **Offer** - Successful applications
  - **Rejected** - Unsuccessful applications
- Drag-and-drop interface for status updates
- Notes and URL tracking for each application
- Progress statistics

### 📝 Productivity Tools

- **Todo Management**
  - Create, edit, delete todos
  - Mark tasks as complete
  - Link todos to job applications or career goals
  - Due date tracking
  
- **Deadline Tracking**
  - Add interview dates and important milestones
  - Color-coded status indicators (overdue, today, upcoming)
  - Link deadlines to specific applications

### 📈 Dashboard

- Career progress overview
- Application statistics (total, by status)
- Productivity metrics (tasks completed, pending)
- Real-time progress tracking

---

## 🛠 Tech Stack

### Frontend

| Technology | Purpose | Version |
|------------|---------|---------|
| [Next.js](https://nextjs.org/) | React framework | 16.2.6 |
| [React](https://react.dev/) | UI library | 19.2.4 |
| [TypeScript](https://www.typescriptlang.org/) | Type safety | 5.x |
| [Tailwind CSS](https://tailwindcss.com/) | Styling | 4.x |
| [@dnd-kit](https://dndkit.com/) | Drag and drop | 6.1.0 |
| [Lucide React](https://lucide.dev/) | Icons | 0.400.0 |

### Backend

| Technology | Purpose | Version |
|------------|---------|---------|
| [FastAPI](https://fastapi.tiangolo.com/) | Web framework | 0.136.3 |
| [SQLAlchemy](https://www.sqlalchemy.org/) | ORM | 2.0.40 |
| [Uvicorn](https://www.uvicorn.org/) | ASGI server | 0.47.0 |
| [PyPDF](https://pypdf.io/) | PDF processing | 6.1.3 |
| [python-docx](https://python-docx.readthedocs.io/) | DOCX processing | 1.2.0 |
| [sentence-transformers](https://sbert.net/) | Text embeddings | 5.1.1 |

### Database

- **SQLite** - Local file-based database for persistent storage

---

## 📁 Project Structure

```
CareerPilot-StackFellas/
├── backend/                      # FastAPI backend
│   ├── app/
│   │   ├── api/                   # API route handlers
│   │   │   ├── assistant_routes.py
│   │   │   ├── calendar_routes.py
│   │   │   ├── cover_letter_routes.py
│   │   │   ├── cv_routes.py
│   │   │   ├── fit_routes.py
│   │   │   ├── job_routes.py
│   │   │   ├── rag_routes.py
│   │   │   ├── skills_fit_routes.py
│   │   │   ├── todo_routes.py
│   │   │   └── tracker_routes.py
│   │   ├── models/                # Pydantic & SQLAlchemy models
│   │   ├── services/              # Business logic services
│   │   ├── storage/              # File storage & database
│   │   ├── utils/                # Utility functions
│   │   ├── database.py           # Database configuration
│   │   └── main.py               # FastAPI app entry point
│   ├── tests/                    # Backend tests
│   ├── requirements.txt          # Python dependencies
│   └── README.md                 # Backend documentation
│
├── frontend/                     # Next.js frontend
│   ├── src/
│   │   ├── app/                  # Next.js App Router pages
│   │   │   ├── assistant/        # AI Assistant page
│   │   │   ├── dashboard/        # Dashboard page
│   │   │   ├── jobs/             # Job listings page
│   │   │   ├── productivity/     # Todos & deadlines page
│   │   │   ├── tracker/          # Kanban board page
│   │   │   ├── upload/           # CV upload page
│   │   │   ├── globals.css        # Global styles
│   │   │   ├── layout.tsx        # Root layout
│   │   │   └── page.tsx          # Home page
│   │   ├── components/           # React components
│   │   │   ├── add-application-modal.tsx
│   │   │   ├── deadline-list.tsx
│   │   │   ├── job-card.tsx
│   │   │   ├── kanban-board.tsx
│   │   │   ├── kanban-column.tsx
│   │   │   ├── navigation.tsx
│   │   │   ├── page-shell.tsx
│   │   │   ├── progress-widget.tsx
│   │   │   ├── stat-card.tsx
│   │   │   ├── todo-form.tsx
│   │   │   ├── todo-item.tsx
│   │   │   └── todo-list.tsx
│   │   └── types/               # TypeScript type definitions
│   │       └── productivity.ts
│   ├── public/                   # Static assets
│   ├── package.json              # Node dependencies
│   ├── tsconfig.json             # TypeScript config
│   └── next.config.ts            # Next.js config
│
├── docs/                         # Documentation
├── README.md                     # This file
└── requirements.txt              # (optional) Project-level dependencies
```

---

## ✅ Prerequisites

Before you begin, ensure you have the following installed:

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| [Node.js](https://nodejs.org/) | 18.x or higher | `node --version` |
| [npm](https://www.npmjs.com/) | 9.x or higher | `npm --version` |
| [Python](https://www.python.org/) | 3.10 or higher | `python --version` |
| [Git](https://git-scm.com/) | Latest | `git --version` |

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/fuad13579/CareerPilot-StackFellas.git
cd CareerPilot-StackFellas
```

### 2. Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Git Bash:
source .venv/Scripts/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
uvicorn app.main:app --reload
```

The backend will be available at: **http://localhost:8000**

API documentation: **http://localhost:8000/docs**

### 3. Setup Frontend

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at: **http://localhost:3000**

---

## ⚙️ Environment Variables

### Backend Configuration

The backend uses environment variables for configuration. Create a `.env` file in the `backend/` directory:

```env
# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# CV Upload Settings
INCLUDE_EXTRACTED_TEXT_IN_UPLOAD_RESPONSE=true

# Fit Score Engine Weights (optional)
FIT_SCORE_SKILL_WEIGHT=0.75
FIT_SCORE_KEYWORD_WEIGHT=0.25

# Common Skills Override (optional, comma-separated)
# FIT_SCORE_COMMON_SKILLS=python,javascript,react,node,sql
```

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ORIGINS` | `*` | Allowed origins for CORS |
| `INCLUDE_EXTRACTED_TEXT_IN_UPLOAD_RESPONSE` | `true` | Include extracted CV text in upload response |
| `FIT_SCORE_SKILL_WEIGHT` | `0.75` | Weight for skill matching in fit score |
| `FIT_SCORE_KEYWORD_WEIGHT` | `0.25` | Weight for keyword matching in fit score |

### Frontend Configuration

Create a `.env.local` file in the `frontend/` directory (optional):

```env
# API URL (defaults to relative path when not set)
# NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🎮 Demo Flow

### Career Goal Flow

1. Navigate to **Dashboard**
2. View career progress overview
3. See statistics on active applications

### Job Tracker Flow

1. Navigate to **Tracker** (sidebar)
2. Click **Add Application** button
3. Fill in job details:
   - Job Title: "Backend Engineer"
   - Company: "TechCorp"
   - URL: "https://example.com/job/123"
4. Application appears in **Applied** column
5. Drag application to **Interviewing** → **Offer** (or **Rejected**)
6. View updated statistics in Dashboard

### Productivity Flow

1. Navigate to **Productivity** (sidebar)
2. **Add Todo**:
   - Title: "Prepare for technical interview"
   - Due Date: Select a date
   - Link to: Select an application
3. Todo appears in pending list
4. Click checkbox to mark complete
5. View progress widget updating

### CV Upload Flow

1. Navigate to **Upload** (sidebar)
2. Drag and drop a `.pdf` or `.docx` file
3. View extracted information
4. Use CV for fit score calculations

---

## 📜 Available Scripts

### Frontend (from `frontend/` directory)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

### Backend (from `backend/` directory)

| Command | Description |
|---------|-------------|
| `uvicorn app.main:app --reload` | Start development server with hot reload |
| `uvicorn app.main:app` | Start production server |
| `python -m pytest` | Run tests |

---

## 🔧 Troubleshooting

### Common Issues

#### npm install fails

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Python venv not activating

```powershell
# Set execution policy (Windows)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Try activating again
.\.venv\Scripts\Activate.ps1
```

#### Port already in use

**Frontend (port 3000):**
```bash
# Kill process using port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Backend (port 8000):**
```bash
# Kill process using port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

#### Database connection issues

The SQLite database is auto-created at `backend/app/storage/careerpilot.db`. Ensure the directory exists:

```bash
mkdir -p backend/app/storage
```

#### CORS errors

Ensure `CORS_ORIGINS` in backend `.env` includes your frontend URL:
```env
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

---

## 🚀 Future Improvements

We have exciting plans for CareerPilot:

- **🤖 AI Career Recommendations** - Personalized suggestions based on profile
- **📄 Resume Analysis** - Deep CV parsing and skill extraction
- **🎤 Interview Preparation** - AI-powered mock interviews
- **🔔 Notifications** - Email/SMS reminders for deadlines
- **📅 Calendar Integration** - Sync with Google Calendar and Outlook
- **📱 Mobile App** - Native iOS and Android applications
- **🔍 Job Search Aggregator** - Search jobs from multiple platforms

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Contributors

Built with ❤️ by [StackFellas](https://github.com/fuad13579)

---

<div align="center">
  <strong>CareerPilot - Plan Your Career, Track Your Success</strong>
</div>
