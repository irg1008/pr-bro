-- AlterTable
ALTER TABLE "Routine" ADD COLUMN     "isDeload" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "WorkoutLog" ADD COLUMN     "isDeload" BOOLEAN NOT NULL DEFAULT false;
