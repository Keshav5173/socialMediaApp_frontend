# Frontend — Creator Contest Platform (User App)

React client for the User Service. Handles signup/login, profile/residency setup, post creation, and the social feed — consuming the User Service's REST API.

## Tech Stack
- **Framework:** React (Vite)
- **Styling:** Tailwind CSS
- **HTTP:** Axios (or fetch) against the User Service API
- **Routing:** React Router

## Features
- Signup / login, with JWT-based session handling (access + refresh token flow against the User Service)
- Profile setup, including setting residency (state/city) — required for contest eligibility
- Create post with real file upload, client-side type/size validation, and a preview before submitting
- Feed view: paginated/randomized post list with like counts and per-post "already liked" state
- Like and comment on posts, with optimistic/idempotent like handling matching the backend
- Contest leaderboard views for the 5 live categories exposed by the User Service (Top Creators, Most Liked Post, Most Commented Post, Most Active User, Most Active Contributor)


## Running Locally
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Live Deployment
Deployed alongside the User Service on the same AWS EC2 instance: `http://65.2.69.203`

