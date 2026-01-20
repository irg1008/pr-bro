/*
  Warnings:

  - You are about to drop the column `note` on the `RoutineExercise` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "RoutineExercise" DROP COLUMN "note",
ADD COLUMN     "notes" TEXT;
