import type { SetType } from "@/types/set-types";
import type { ExerciseType } from "prisma/generated/client";

export interface WorkoutSet {
  weight?: number | "";
  reps?: number | "";
  duration?: number | "";
  distance?: number | "";
  calories?: number | "";
  completed: boolean;
  type?: SetType;
}

export interface ExerciseForProgression {
  id: string;
  name: string;
  type: ExerciseType;
  targetReps?: string | null;
  targetSets?: string | null;
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

export interface ProgressionResult {
  newSets: WorkoutSet[];
  diff: ProgressionDifference | null;
  applied: boolean;
  failureReason?: string;
}

/**
 * Creates an empty WorkoutSet based on exercise type
 */
export function createEmptySet(exerciseType: ExerciseType = "WEIGHT"): WorkoutSet {
  if (exerciseType === "CARDIO") {
    return { duration: "", distance: "", calories: "", completed: false, type: "NORMAL" };
  }
  return { weight: "", reps: "", completed: false, type: "NORMAL" };
}

/**
 * Apply progressive overload to an exercise based on last run data.
 *
 * Rules:
 * - WARMUP sets: Copy exactly from previous run (weight, reps, type preserved)
 * - NORMAL sets: Apply overload (if qualified: increase weight, reset reps to min)
 * - Other set types (FAILURE, DROPSET, PAIN, etc.): Skipped/excluded
 *
 * @param exercise - The exercise to apply overload to
 * @param lastSets - The sets from the last run of this exercise
 * @returns ProgressionResult with new sets and diff info
 */
export function applyProgressiveOverload(
  exercise: ExerciseForProgression,
  lastSets: any[]
): ProgressionResult {
  // No target reps means we can't calculate progression
  if (!exercise.targetReps) {
    return {
      newSets: [],
      diff: null,
      applied: false,
      failureReason: "No target reps defined"
    };
  }

  // No history
  if (!lastSets || lastSets.length === 0) {
    return {
      newSets: [],
      diff: null,
      applied: false,
      failureReason: "No history found"
    };
  }

  // Parse target reps (e.g., "8-12" or "10")
  const targetParts = exercise.targetReps.split("-").map((s) => parseInt(s.trim()));
  const maxReps = targetParts.length > 1 ? targetParts[1] : targetParts[0];
  const minReps = targetParts[0];

  // Separate sets by type
  const normalSets = lastSets.filter((s) => !s.type || s.type === "NORMAL");
  const warmupSets = lastSets.filter((s) => s.type === "WARMUP");
  // Other types (FAILURE, DROPSET, PAIN, etc.) are intentionally excluded

  // Check if all normal sets hit the target
  const allNormalSetsHitTarget = normalSets.every((s) => s.reps >= maxReps);
  const lastNormalWeight = normalSets[0]?.weight;

  // Build new sets array
  const newExSets: WorkoutSet[] = [];

  // Always copy warmup sets exactly as they were
  warmupSets.forEach((s) => {
    newExSets.push({
      ...createEmptySet(exercise.type),
      weight: s.weight,
      reps: s.reps,
      type: "WARMUP"
    });
  });

  if (allNormalSetsHitTarget && lastNormalWeight) {
    // PROMOTION: Increase weight for NORMAL sets
    const increment = exercise.incrementValue || 2.5;
    const nextWeight = Number(lastNormalWeight) + increment;

    // Add overloaded normal sets
    normalSets.forEach(() => {
      newExSets.push({
        ...createEmptySet(exercise.type),
        weight: nextWeight,
        reps: minReps,
        type: "NORMAL"
      });
    });

    // Fill sets if less than target
    if (exercise.targetSets) {
      const targetSetCount = parseInt(exercise.targetSets);
      const currentNormalCount = newExSets.filter((s) => !s.type || s.type === "NORMAL").length;
      if (!isNaN(targetSetCount) && currentNormalCount < targetSetCount) {
        const diff = targetSetCount - currentNormalCount;
        for (let k = 0; k < diff; k++) {
          newExSets.push({
            ...createEmptySet(exercise.type),
            weight: nextWeight,
            reps: minReps,
            type: "NORMAL"
          });
        }
      }
    }

    return {
      newSets: newExSets,
      diff: {
        exerciseName: exercise.name,
        oldWeight: Number(lastNormalWeight),
        oldReps: maxReps,
        newWeight: nextWeight,
        newReps: minReps,
        type: "PROMOTION"
      },
      applied: true
    };
  } else if (lastNormalWeight) {
    // RESET: Keep weight, set reps to MIN reps
    normalSets.forEach((s) => {
      newExSets.push({
        ...createEmptySet(exercise.type),
        weight: s.weight,
        reps: minReps,
        type: "NORMAL"
      });
    });

    // Fill sets if less than target
    if (exercise.targetSets) {
      const targetSetCount = parseInt(exercise.targetSets);
      const currentNormalCount = newExSets.filter((s) => !s.type || s.type === "NORMAL").length;
      if (!isNaN(targetSetCount) && currentNormalCount < targetSetCount) {
        const diff = targetSetCount - currentNormalCount;
        for (let k = 0; k < diff; k++) {
          newExSets.push({
            ...createEmptySet(exercise.type),
            weight: lastNormalWeight,
            reps: minReps,
            type: "NORMAL"
          });
        }
      }
    }

    return {
      newSets: newExSets,
      diff: {
        exerciseName: exercise.name,
        oldWeight: Number(lastNormalWeight),
        oldReps: minReps,
        newWeight: Number(lastNormalWeight),
        newReps: minReps,
        type: "RESET"
      },
      applied: true,
      failureReason: `Did not hit max reps (${maxReps}) on all sets`
    };
  } else {
    // Fallback: copy warmups + normal sets with weights but no reps
    normalSets.forEach((s) => {
      newExSets.push({
        ...createEmptySet(exercise.type),
        weight: s.weight,
        reps: "",
        type: "NORMAL"
      });
    });

    return {
      newSets: newExSets,
      diff: null,
      applied: false,
      failureReason: "Last run had no weight recorded"
    };
  }
}
