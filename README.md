# Chat Application

A full-stack real-time chat application with authentication, room management, and live messaging.

## Overview

This project is split into two parts:

- frontend: Next.js app with NextAuth, MongoDB models, and REST API routes for auth, rooms, and message persistence.
- backend: Express + Socket.IO server for real-time communication (online users and live message broadcast).

Users can:

- Register with email/password
- Sign in with Google
- Create chat rooms
- Join rooms with a 6-character room code
- Send and receive messages in real time
- See who is currently online in a room

## Tech Stack

- Frontend: Next.js (App Router), React, NextAuth
- Backend (Realtime): Node.js, Express, Socket.IO
- Database: MongoDB + Mongoose
- Auth: Credentials + Google OAuth

## Project Structure

```text
Chat Application/
|- README.md
|- backend/
|  |- package.json
|  |- server.js
|- frontend/
	|- package.json
	|- app/
	|- lib/
	|- models/
	|- providers/
```

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB connection string
- Google OAuth credentials (optional, only if Google login is needed)

## Environment Variables

Create a file at frontend/.env.local:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority
NEXTAUTH_SECRET=replace-with-a-long-random-secret
NEXTAUTH_URL=http://localhost:3000

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Notes:

- MONGODB_URI is required.
- NEXTAUTH_SECRET is required.
- GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are only required for Google sign-in.

## Installation

From the workspace root, install dependencies for both apps.

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Running Locally

Run both services in separate terminals.

1. Start the Socket.IO server (port 5000)

```bash
cd backend
node server.js
```

Optional dev mode:

```bash
npx nodemon server.js
```

2. Start the Next.js app (port 3000)

```bash
cd frontend
npm run dev
```

Open http://localhost:3000

## App Flow

1. Register or sign in on the frontend.
2. Create a room or join by room code in the dashboard.
3. Open a room and start chatting.
4. Messages are saved to MongoDB and broadcast instantly through Socket.IO.

## Main API Routes (Next.js)

- POST /api/register
- GET|POST /api/auth/[...nextauth]
- GET|POST /api/rooms
- POST /api/rooms/join
- GET|POST /api/rooms/:roomId/messages

## Socket Events

Server URL: http://localhost:5000

- joinRoom
- leaveRoom
- sendMessage
- receiveMessage
- roomUsers

## Available Scripts

Frontend (in frontend/package.json):

- npm run dev
- npm run build
- npm run start
- npm run lint

Backend (in backend/package.json):

- No custom scripts currently defined

## Troubleshooting

- If auth fails, verify NEXTAUTH_SECRET and NEXTAUTH_URL.
- If database calls fail, verify MONGODB_URI.
- If real-time messages do not appear, confirm backend is running on port 5000.
- If Google login fails, verify OAuth credentials and callback settings.

## Future Improvements

- Add backend scripts (start/dev) in backend/package.json
- Add unit and integration tests
- Add Docker and production deployment configuration