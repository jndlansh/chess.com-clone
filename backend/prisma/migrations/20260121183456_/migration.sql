-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "blackTimeLeft" INTEGER,
ADD COLUMN     "timeControl" INTEGER NOT NULL DEFAULT 600000,
ADD COLUMN     "whiteTimeLeft" INTEGER;
