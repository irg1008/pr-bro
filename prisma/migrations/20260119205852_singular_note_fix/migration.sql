/*
  Warnings:

  - You are about to drop the column `notes` on the `RoutineExercise` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `WorkoutLogEntry` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "RoutineExercise" DROP COLUMN "notes",
ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "WorkoutLogEntry" DROP COLUMN "notes",
ADD COLUMN     "note" TEXT;
