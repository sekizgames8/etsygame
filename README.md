# Steam Guard Code Portal

A real-time full-stack application for distributing Steam Guard codes to users.

## Features
- **Real-time WebSocket Updates**: Users see code status instantly.
- **Background Workers**: BullMQ worker handles Steam login and Gmail checking.
- **Admin Panel**: Manage Users, Games, and Steam Accounts.
- **Modern UI**: Glassmorphism design with TailwindCSS.

## Architecture
- **Frontend**: Next.js 14 (App Router), TailwindCSS, Framer Motion, Socket.IO Client.
- **Backend**: Node.js, Express, Socket.IO, BullMQ, Redis.
- **Database**: PostgreSQL with Prisma ORM.
- **Worker**: Isolated worker for Steam/Gmail automation.

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis Server (Must be running for Queues)

### Backend Setup
1. Navigate to `backend`:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Setup Environment:
   - Rename `env.example` to `.env`.
   - Update `DATABASE_URL` and `REDIS_URL`.
   - Set `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` for fetching codes.
   - Set `ENCRYPTION_KEY` (32 chars).
4. Run Migrations:
   ```bash
   npx prisma db push
   ```
5. Start Server & Worker:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate to `frontend`:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run Development Server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000`.

## Usage Flow
1. **Admin Login**: Manually create an admin user in DB or use a seed script. Login at `/`.
2. **Admin Dashboard**:
   - Add a Game (e.g. "Cyberpunk 2077").
   - Add a Steam Account (Username, Password, Gmail Token).
   - Create a User.
   - Assign the Account to the User.
3. **User Login**: Login as the created user.
4. **Get Code**: Click "Kodu Gönder" on the game card.
   - Status changes: Queued -> Processing -> Waiting for Mail -> Done.
   - Code appears on the card.

## Note on Gmail/Steam
- The worker expects a valid Gmail OAuth2 Refresh Token to poll for emails.
- `steam-user` library is used to trigger the login event.

