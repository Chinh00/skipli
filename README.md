# Mini Trello: Real-Time Board Management

A real-time, collaborative task management application built with a modern TypeScript full-stack. Features instant board synchronization, drag-and-drop management, and deep GitHub integration.

[![CI Pipeline](https://github.com/your-username/skipli/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/skipli/actions)

---

## 🚀 Quick Start

Get the entire stack running in one command using Docker.

### 1. Prerequisites
*   [Docker](https://www.docker.com/get-started) & Docker Compose
*   A Google Firebase Project (for Firestore)
*   A GitHub OAuth Application (for GitHub Integration)

### 2. Configure Environment
Create `.env` files in both `/backend` and `/frontend` directories (refer to `.env.example` if provided, or the keys below):

**Backend (`backend/.env`):**
```env
JWT_SECRET=your_jwt_secret
FIREBASE_SERVICE_ACCOUNT={"type": "service_account", ...}
GITHUB_CLIENT_ID=your_id
GITHUB_CLIENT_SECRET=your_secret
GITHUB_CALLBACK_URL=http://localhost:5173/github/callback
```

### 3. Launch
```bash
docker-compose up
```
*   **Frontend**: [http://localhost:5173](http://localhost:5173)
*   **Backend API**: [http://localhost:5001](http://localhost:5001)
*   **MailHog UI**: [http://localhost:8025](http://localhost:8025) — local verification emails

---

## 🚢 Production Deployment with GHCR

Production images are published to GitHub Container Registry (GHCR):

- `ghcr.io/chinh00/skipli-backend:latest`
- `ghcr.io/chinh00/skipli-frontend:latest`

Each push to `main` also publishes short-SHA tags for rollback, for example `ghcr.io/chinh00/skipli-backend:2d69293`.

### Required GitHub configuration

Create a repository variable before publishing frontend images:

```text
VITE_API_URL=http://your-production-host-or-domain:5001
```

This value is embedded into the Vite frontend at image build time.

### Server setup

Create the backend production env file on the server:

```bash
cp backend/.env.production.example backend/.env.production
```

Edit `backend/.env.production` and fill in real production values. Do not commit this file.

If GHCR packages are private, log in on the server with a GitHub token that can read packages:

```bash
docker login ghcr.io
```

Start production containers:

```bash
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d
```

Deploy or rollback to a specific image tag:

```bash
IMAGE_TAG=<short-sha> docker compose -f docker-compose.production.yml up -d
```

Default ports can be overridden:

```bash
FRONTEND_PORT=8080 BACKEND_PORT=5001 docker compose -f docker-compose.production.yml up -d
```


### Local SMTP for non-Docker development

If you run the backend/frontend with `npm run dev` instead of Docker Compose, run only MailHog in Docker:

```bash
docker run --rm -p 1025:1025 -p 8025:8025 mailhog/mailhog:v1.0.1
```

Then use these backend env values:

```env
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=Mini Trello <no-reply@skipli.local>
```

Open local emails at [http://localhost:8025](http://localhost:8025).

## ✨ Key Features

*   **⚡ Real-time Sync**: Instant updates across all connected clients using Socket.io.
*   **🎯 Drag-and-Drop**: Smooth, interactive task reordering and column movement via `dnd-kit`.
*   **🐙 GitHub Integration**: Connect your account and attach Pull Requests, Issues, or Branches directly to Trello tasks.
*   **🔐 Secure Auth**: JWT-based authentication with simple email verification codes (logged to terminal in dev mode).
*   **🛡️ Type-Safe**: End-to-end TypeScript integration from the database schema to the UI components.

---

## 🏗️ Technical Architecture

<details>
<summary><b>Real-Time Synchronization (WebSockets)</b></summary>

The application uses **Socket.io** to manage collaborative sessions:
1.  **Room Strategy**: Upon viewing a board, the client emits a `join-board` event with the `boardId`. The backend places the socket into a specific room.
2.  **State Broadcasts**: Any state-changing API request (e.g., `POST /tasks`, `PUT /tasks/:id`) triggers a broadcast from the backend to that specific `boardId` room.
3.  **UI Updates**: Clients listen for events like `task-created` or `task-updated` to refresh the local state or trigger a specific data fetch.

</details>

<details>
<summary><b>GitHub Integration Flow</b></summary>

The integration uses the **GitHub REST API**:
*   **OAuth**: Implements the standard handshake (Code -> Token). The token is securely stored in the user's Firestore profile.
*   **Attachment Engine**: Tasks contain a `githubAttachments` array. The UI allows users to search their repositories and link specific entities (PR #12, Issue #42).
*   **Service Layer**: A dedicated `githubController` handles token exchange and proxying requests to GitHub to avoid exposing tokens on the frontend.

</details>

<details>
<summary><b>Data Model (Firestore)</b></summary>

We use a hierarchical NoSQL structure:
*   **`users`**: Profile and integration tokens.
*   **`boards`**: Root entity containing metadata and membership lists.
*   **`cards`**: (Columns) Sub-collection of a Board.
*   **`tasks`**: Sub-collection of a Card, containing titles, descriptions, and GitHub references.

</details>

<details>
<summary><b>CI/CD Pipeline</b></summary>

Automated via **GitHub Actions** (`.github/workflows/ci.yml`):
*   **Parallel Jobs**: Backend and Frontend checks run concurrently.
*   **Validation**: Each commit is verified against Linting, TypeScript compilation (`tsc`), and the Jest unit test suite.

</details>

---

## 🛠️ Development & Testing

### Running Locally (Without Docker)
1.  **Backend**: `cd backend && npm install && npm run dev`
2.  **Frontend**: `cd frontend && npm install && npm run dev`

### Running Tests
We use **Jest** for backend logic and API verification.
```bash
cd backend
npm test
```

---

## 🧰 Tech Stack

*   **Frontend**: React 19, Vite, Tailwind CSS, dnd-kit, Socket.io-client.
*   **Backend**: Node.js, Express, Socket.io, Firebase Admin SDK.
*   **Database**: Google Firebase (Firestore).
*   **Orchestration**: Docker, Docker Compose.
*   **Language**: TypeScript (Strict Mode).
