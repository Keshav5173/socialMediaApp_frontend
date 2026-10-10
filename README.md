# Frontend — Connecto

React client for the Connecto social media platform. Handles signup/login, profile setup, post creation, and the social feed — consuming the User Service's REST API.

> **Built with [Kiro](https://kiro.dev)** — from the first file to the final deployment, every part of this project was developed using Kiro, an AI-powered development environment.

## Tech Stack

- **Framework:** React 19 (Vite)
- **Styling:** Tailwind CSS v4
- **HTTP:** Axios
- **Routing:** React Router v7
- **Auth:** JWT-based session handling (access + refresh token flow)

## Features

- Signup / login with JWT-based session handling (access + refresh token flow)
- Profile setup, including residency (state/city) — required for contest eligibility
- Create post with real file upload, client-side type/size validation, and preview before submitting
- Feed view: paginated/randomized post list with like counts and per-post "already liked" state
- Like and comment on posts, with optimistic/idempotent like handling matching the backend
- Contest leaderboard views for 5 live categories:
  - Top Creators
  - Most Liked Post
  - Most Commented Post
  - Most Active User
  - Most Active Contributor

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
