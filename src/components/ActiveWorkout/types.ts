import type { SetType } from "@/types/set-types";
import type { Exercise } from "prisma/generated/client";

export interface WorkoutSet {
  weight?: number | "";
  reps?: number | "";
  duration?: number | "";
  distance?: number | "";
  calories?: number | "";
  completed: boolean;
  type?: SetType;
}

export interface ActiveWorkoutExercise extends Exercise {
  routineNote?: string | null;
  sessionNote?: string | null;
  targetSets?: string | null;
  targetReps?: string | null;
  targetType?: "REPS" | "DURATION" | null;
  targetRepsToFailure?: string | null;
  incrementValue?: number | null;
}

export interface ProgressionDifference {
  exerciseName: string;
  oldWeight: number;
  oldReps: number;
  newWeight: number;
  newReps: number;
  type: "PROMOTION" | "RESET";
}

export interface ActiveWorkoutProps {
  logId: string;
  initialStartTime: string;
  routineName: string;
  routineId: string;
  routineGroupId: string;
  routineExerciseIds: string[];
  exercises: ActiveWorkoutExercise[];
  initialSupersetStatus?: Record<string, boolean>;
  routineExercisesList?: { exerciseId: string; isActive?: boolean | null; exercise: Exercise }[];
  isDeload?: boolean;
}
