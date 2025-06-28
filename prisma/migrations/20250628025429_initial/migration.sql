-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('WAITING', 'PLAYING', 'ENDED');

-- CreateEnum
CREATE TYPE "GamePhase" AS ENUM ('DAY', 'NIGHT');

-- CreateEnum
CREATE TYPE "ObjectState" AS ENUM ('UNTOUCHED', 'PLACED', 'DESTROYED', 'CLEANED', 'VISITED');

-- CreateEnum
CREATE TYPE "PlayerRole" AS ENUM ('TRAITOR', 'FAITHFUL');

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'WAITING',
    "currentPhase" "GamePhase" NOT NULL DEFAULT 'DAY',
    "currentDay" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "autoPhaseEnabled" BOOLEAN NOT NULL DEFAULT false,
    "phaseStartTime" TIMESTAMP(3),
    "phaseDurationHours" INTEGER NOT NULL DEFAULT 12,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "role" "PlayerRole",
    "isAlive" BOOLEAN NOT NULL DEFAULT true,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "phase" "GamePhase" NOT NULL,
    "day" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Narration" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "phase" "GamePhase" NOT NULL,
    "day" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Narration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerMission" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "phase" "GamePhase" NOT NULL,
    "day" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaosEvent" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "phase" "GamePhase" NOT NULL,
    "day" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChaosEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Whisper" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "fromPlayerId" TEXT NOT NULL,
    "toPlayerId" TEXT NOT NULL,
    "phase" "GamePhase" NOT NULL,
    "day" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "isLeaked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Whisper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomObject" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "state" "ObjectState" NOT NULL DEFAULT 'UNTOUCHED',
    "lastAction" TEXT,
    "lastUpdatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalItem" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "PersonalItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacedItem" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "phase" "GamePhase" NOT NULL,
    "day" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlacedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomLog" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "phase" "GamePhase" NOT NULL,
    "day" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Game_code_key" ON "Game"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Player_gameId_name_key" ON "Player"("gameId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_gameId_voterId_phase_day_key" ON "Vote"("gameId", "voterId", "phase", "day");

-- CreateIndex
CREATE UNIQUE INDEX "Narration_gameId_phase_day_key" ON "Narration"("gameId", "phase", "day");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerMission_gameId_playerId_phase_day_key" ON "PlayerMission"("gameId", "playerId", "phase", "day");

-- CreateIndex
CREATE UNIQUE INDEX "Whisper_gameId_fromPlayerId_phase_day_key" ON "Whisper"("gameId", "fromPlayerId", "phase", "day");

-- CreateIndex
CREATE UNIQUE INDEX "RoomObject_gameId_name_key" ON "RoomObject"("gameId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalItem_gameId_playerId_name_key" ON "PersonalItem"("gameId", "playerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PlacedItem_gameId_playerId_itemName_key" ON "PlacedItem"("gameId", "playerId", "itemName");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Narration" ADD CONSTRAINT "Narration_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMission" ADD CONSTRAINT "PlayerMission_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMission" ADD CONSTRAINT "PlayerMission_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaosEvent" ADD CONSTRAINT "ChaosEvent_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Whisper" ADD CONSTRAINT "Whisper_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Whisper" ADD CONSTRAINT "Whisper_fromPlayerId_fkey" FOREIGN KEY ("fromPlayerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Whisper" ADD CONSTRAINT "Whisper_toPlayerId_fkey" FOREIGN KEY ("toPlayerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomObject" ADD CONSTRAINT "RoomObject_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalItem" ADD CONSTRAINT "PersonalItem_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalItem" ADD CONSTRAINT "PersonalItem_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacedItem" ADD CONSTRAINT "PlacedItem_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacedItem" ADD CONSTRAINT "PlacedItem_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacedItem" ADD CONSTRAINT "PlacedItem_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "RoomObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomLog" ADD CONSTRAINT "RoomLog_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
