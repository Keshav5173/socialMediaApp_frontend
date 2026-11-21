# Frontend: Connecto

React client for the Connecto social media platform. It covers signup/login, profile setup, post creation, the social feed, real-time chat and video calls, consuming the User Service's REST API and Socket.IO server.

**🔴 Live:** [https://connectoo.duckdns.org](https://connectoo.duckdns.org)

## Tech Stack

- **Framework:** React 19 (Vite)
- **Styling:** Tailwind CSS v4
- **State:** Zustand (video call state)
- **HTTP:** Axios
- **Real-time:** Socket.IO client, WebRTC
- **Routing:** React Router v7
- **Icons:** lucide-react
- **Auth:** JWT session handling (access + refresh token flow)

## Features

- Signup / login with access + refresh token flow and automatic token refresh
- Protected routes
- Profile setup, including residency (state/city), required for contest eligibility
- Create posts with real file upload, client-side type/size validation and preview
- Feed view: paginated/randomized post list with like counts and per-post "already liked" state
- Like and comment on posts, with idempotent like handling matching the backend
- **Friends and chat:**
  - Search users by username and add friends
  - Real-time messaging with text, image, video and document attachments (25 MB limit)
  - Unread badges, last-message previews and a responsive WhatsApp-style layout
- **Video and voice calls:**
  - Full-screen call UI with incoming-call screen, call timer, mute, camera toggle and picture-in-picture self view
  - WebRTC peer-to-peer media with Socket.IO signaling
- **Contest leaderboards** for 5 live categories:
  - Top Creators
  - Most Liked Post
  - Most Commented Post
  - Most Active User
  - Most Active Contributor

## Environment Variables

Create a `.env` file in the project root (next to `package.json`):

```env
VITE_API_BASE_URL
VITE_SOCKET_URL
```

Vite bakes these values in at build time, so **rebuild after changing them**.

## Running Locally

```bash
npm install
npm run dev
```

Camera and microphone access works on `localhost` and HTTPS only.

## Build

```bash
npm run build
npm run preview
```

## Deployment

The build output is served by Nginx on AWS EC2 under HTTPS (Let's Encrypt on a DuckDNS domain), alongside the backend:

Nginx serves the static files, with `/api/` and `/socket.io/` proxied to the User Service.


