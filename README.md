# The Traitors - Multiplayer Social Deduction Game

A web-based multiplayer game inspired by "The Traitors" TV show, built with Next.js, Tailwind CSS, and Prisma.

## 🎮 Game Overview

Players are secretly assigned roles as either **Traitors** or **Faithfuls** and participate in a multi-day social deduction game with alternating Day and Night phases.

### Game Flow
1. **Lobby Phase**: Players join using a game code
2. **Role Assignment**: Host starts the game, roles are randomly assigned
3. **Day Phase**: All players vote to banish someone they suspect is a traitor
4. **Night Phase**: Traitors secretly vote to eliminate a faithful player
5. **Win Conditions**:
   - Faithfuls win if all traitors are eliminated
   - Traitors win if they equal or outnumber the faithfuls

## 🚀 Features

### ✅ Phase 1 & 2 (Current)
- **Game Creation & Joining**: Unique game codes for easy joining
- **Role Assignment**: Automatic random distribution (1/3 traitors, 2/3 faithfuls)
- **Day/Night Phases**: Host-controlled phase progression
- **Voting System**:
  - Day: All players vote to banish
  - Night: Only traitors vote to eliminate
- **Admin Dashboard**: Host can see all roles and voting status
- **Real-time Updates**: Game state polling every 3 seconds
- **Win Detection**: Automatic game end when win conditions are met

### 🤖 AI Game Master Features (Phase 2)
- **AI Narration System**: Dramatic storytelling for each phase
- **Mission Generator**: Role-specific missions for each player
- **Game Story Timeline**: Complete chronicle of events
- **Mission Tracking**: Players can mark missions complete
- **Final Reveal**: Complete game analysis with all secrets exposed

### 🚀 Advanced Features (Phase 3)
- **Auto-Phase Progression**: Scheduled day/night cycles with customizable duration
- **Chaos Events**: AI-generated dramatic twists and game-changing events
- **Anonymous Whispers**: Secret messaging system (one per phase)
- **Mobile Optimization**: Responsive design with bottom navigation
- **Enhanced Reveal**: Complete game analysis including whispers and chaos events
- **Semi-Automated Gameplay**: Minimal host intervention required

### 🏛️ Room of Secrets (Phase 4)
- **Interactive Room**: 50 mysterious objects players can interact with
- **Personal Items**: Each player gets 4 unique belongings to place strategically
- **Object Interactions**: Destroy, clean, observe, or place items in objects
- **Symbolic Messaging**: Anonymous room log tracks all interactions
- **Strategic Placement**: Use item placement for subtle communication or misdirection
- **Mission Integration**: Traitor missions can reference room interactions

### 🎯 Tech Stack
- **Frontend**: Next.js 15 with App Router
- **Styling**: Tailwind CSS with dark theme
- **Database**: SQLite with Prisma ORM
- **Session**: localStorage-based player identification
- **Deployment Ready**: Vercel-optimized

## 🛠 Setup & Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
# Install dependencies
npm install

# Set up the database
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000` (or next available port).

## 🎲 How to Play

### For Host:
1. Enter your name and click "Create Game"
2. Share the game code with 3-11 other players
3. Start the game when everyone has joined
4. Use the admin panel (`/game/[gameId]/admin`) to:
   - **Enable auto-phase progression** for hands-off gameplay
   - Generate AI narrations for dramatic storytelling
   - Create missions for all players
   - **Trigger chaos events** for dramatic twists
   - Advance game phases manually (if auto-phase disabled)
   - Monitor voting and player status

### For Players:
1. Enter your name and the game code, then click "Join Game"
2. Wait for the host to start the game
3. You'll be assigned a secret role (Traitor or Faithful)
4. **Check your mission page** for role-specific objectives
5. **Send anonymous whispers** to other players (one per phase)
6. During Day phases: Vote to banish a suspected traitor
7. During Night phases: If you're a traitor, vote to eliminate a faithful
8. **Follow the game story** for immersive narration and chaos events
9. **Use mobile navigation** for easy access to all features

## 🚀 Deployment

The app is ready for deployment on Vercel. For production, consider switching to PostgreSQL by updating the Prisma schema and DATABASE_URL.

## 🎯 Game Balance

- **Minimum Players**: 4 (1 traitor, 3 faithfuls)
- **Maximum Players**: 12 (4 traitors, 8 faithfuls)
- **Traitor Ratio**: ~33% (minimum 1 traitor)
