-- CreateEnum
CREATE TYPE "TargetType" AS ENUM ('REPS', 'DURATION');

-- AlterTable
ALTER TABLE "RoutineExercise" ADD COLUMN     "targetType" "TargetType" NOT NULL DEFAULT 'REPS';
