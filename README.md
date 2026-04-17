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

## Implemented Features

The project now includes the following completed features:

- Room workspace modules
	- Tasks module with status updates, assignment, and role-based controls
	- Resources module for links/files shared in a room
	- Members module with role-aware member management
- Room-scoped RBAC
	- Member roles: admin, moderator, member
	- Admin-only role updates
	- Controlled member removal rules for admin/moderator
- Chat enhancements
	- Reply-to-message flow with quoted reply preview in composer and message bubble
	- Pin/unpin messages for managers
	- Delete message action for managers
	- Right-click message action menu
- Announcements
	- Announcement posting by admin/moderator
	- Separate in-room announcements panel showing announcement history
	- Real-time announcement propagation
- Unread and dashboard awareness
	- Per-room unread message counts derived from lastSeen (not stored as counters)
	- Room highlighting and unread badge in dashboard room cards
	- lastSeen tracking per user per room
	- Unread reset when opening a room
- Dashboard notifications
	- Bell icon with live notification feed
	- Notifications for:
		- member joined room
		- member removed from room
		- new announcement
		- replies directed to the current user

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
- GET|PATCH|DELETE /api/rooms/:roomId
- GET /api/rooms/:roomId/members
- GET|POST /api/rooms/:roomId/messages
- DELETE /api/rooms/:roomId/messages/:messageId
- GET|POST /api/rooms/:roomId/tasks
- PATCH|DELETE /api/rooms/:roomId/tasks/:taskId
- GET|POST /api/rooms/:roomId/resources
- POST /api/announcement
- PATCH /api/message/pin
- PATCH /api/room/promote
- DELETE /api/room/remove-user
- PATCH /api/room/last-seen
- GET /api/room/unread

## Socket Events

Server URL: http://localhost:5000

- joinRoom
- leaveRoom
- sendMessage
- receiveMessage
- roomUsers
- announcementCreated
- messagePinned
- messageDeleted
- roleUpdated
- userRemoved
- newMessageNotification
- dashboardNotification
- memberJoinedNotification

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