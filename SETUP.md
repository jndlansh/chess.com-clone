# Chess Game - Setup Instructions

## Phase 1 Features
✅ User Authentication (Signup/Login)  
✅ Game State Persistence (PostgreSQL)  
✅ ELO Rating System  
✅ Spectator Mode  

## Prerequisites
- Node.js (v16+)
- PostgreSQL database (Supabase account)
- Git

## Setup Steps

### 1. Database Setup (Supabase)

1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project
3. Go to **Settings > Database**
4. Copy the **Connection String** (URI format)
5. Replace the `DATABASE_URL` in `backend/.env` with your connection string

Example:
```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies (already done)
npm install

# Generate Prisma Client (works without database)
npx prisma generate

# Run database migrations (requires database connection)
npx prisma migrate dev --name init

# Start the server
npm run dev
```

The backend will run on `http://localhost:8080`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies (if needed)
npm install

# Start development server
npm run dev
```

The frontend will run on `http://localhost:5173`

## Testing the Application

### 1. Create an Account
- Navigate to `http://localhost:5173`
- Click "Sign up" or go to `/signup`
- Fill in email, username, and password
- You'll be redirected to the game page

### 2. Start a Game
- Click "Play Online" button
- Wait for another player to join (open another browser/incognito window)
- Once matched, the game begins!

### 3. Test Features
- **Persistence**: Refresh the page - your game state is saved
- **Rating**: Complete a game to see rating changes
- **Spectator**: Join a game that's in progress to spectate

## API Endpoints

### Authentication
- `POST /auth/signup` - Create new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user (requires Bearer token)

### WebSocket
- Connect: `ws://localhost:8080?token=YOUR_JWT_TOKEN`
- Messages:
  - `init_game` - Start/join a game
  - `move` - Make a move
  - `spectate` - Watch a game

## Database Schema

### User Table
- id (UUID)
- email (unique)
- username (unique)
- password (hashed)
- rating (default: 1200)
- createdAt

### Game Table
- id (UUID)
- whitePlayerId (FK to User)
- blackPlayerId (FK to User)
- pgn (chess moves)
- fen (board state)
- status (WAITING, IN_PROGRESS, COMPLETED, ABANDONED)
- result (white/black/draw)
- startTime
- endTime
- moves (JSON array)

## Useful Prisma Commands

```bash
# View database in browser
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Create a new migration
npx prisma migrate dev --name migration_name

# Pull schema from existing database
npx prisma db pull
```

## Troubleshooting

### Database connection error
- Check your DATABASE_URL in `.env`
- Ensure Supabase project is running
- Verify IP address is allowed in Supabase settings

### WebSocket authentication error
- Make sure you're logged in
- Check browser console for token
- Verify JWT_SECRET matches in backend

### TypeScript compilation errors
- Run `npx tsc` in backend folder
- Check for missing `.js` extensions in imports
- Ensure all dependencies are installed

### Prisma generate fails
- You can run `npx prisma generate` without database connection
- Only `npx prisma migrate dev` requires database

## Next Phase Features (Coming Soon)
- [ ] Timer/Clock for games
- [ ] Chat functionality
- [ ] Game history viewer
- [ ] Leaderboard page
- [ ] Friend system
- [ ] Tournament mode
- [ ] Game analysis
- [ ] Mobile responsive design

## Tech Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, WebSocket (ws)
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Auth**: JWT + bcrypt
- **Chess Logic**: chess.js

