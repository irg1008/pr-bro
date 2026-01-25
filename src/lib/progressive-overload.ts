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

  // Parse target reps (e.g., "8-12", "10", or "8,5,3")
  let targetPattern: number[] = [];
  let isRange = false;

  if (exercise.targetReps.includes(",")) {
    // Comma-separated list
    targetPattern = exercise.targetReps.split(",").map((s) => parseInt(s.trim()));
  } else if (exercise.targetReps.includes("-")) {
    // Range
    isRange = true;
    const parts = exercise.targetReps.split("-").map((s) => parseInt(s.trim()));
    // For range, we just track min/max for validation, but pattern is effectively "max" for all sets check
    targetPattern = [parts.length > 1 ? parts[1] : parts[0]];
  } else {
    // Single number
    targetPattern = [parseInt(exercise.targetReps.trim())];
  }

  const minReps = isRange
    ? parseInt(exercise.targetReps.split("-")[0].trim())
    : targetPattern[targetPattern.length - 1]; // Use last value as fallback min? Or just use pattern logic.

  // Separate sets by type
  const normalSets = lastSets.filter((s) => !s.type || s.type === "NORMAL");
  const warmupSets = lastSets.filter((s) => s.type === "WARMUP");

  // VALIDATION Logic
  let allNormalSetsHitTarget = false;

  if (exercise.targetReps.includes(",")) {
    // Comma logic: Check each set against its corresponding target
    // If we have 3 targets "8,5,3" and 3 sets, we compare index 0 to 8, 1 to 5, 2 to 3.
    // If more sets than targets, cycle the last target? Or just fail? Let's assume repeat last target for now or just check existing.
    // Actually, usually RPT (Reverse Pyramid Training) has specific targets per set.

    // We only check the sets we have targets for. If sets < targets, we can't fully validate, but let's assume we check what we have.
    // Spec: "those will only overload on weights". Implies we just check if they hit the rep target for that set index.

    if (normalSets.length === 0) {
      allNormalSetsHitTarget = false;
    } else {
      allNormalSetsHitTarget = normalSets.every((set, index) => {
        // Get target for this set index. If index exceeds pattern, use last pattern value.
        const targetForSet = targetPattern[Math.min(index, targetPattern.length - 1)];
        return set.reps >= targetForSet;
      });
    }
  } else {
    // Standard logic
    const maxReps = targetPattern[0];
    allNormalSetsHitTarget = normalSets.every((s) => s.reps >= maxReps);
  }

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
    normalSets.forEach((s, index) => {
      // Determine target reps for this new set
      let nextTargetReps = minReps; // Default for range/single

      if (exercise.targetReps?.includes(",")) {
        // For comma pattern, we keep the same rep target pattern for the next workout
        // e.g. if we did 8,5,3 @ 100kg -> next is 8,5,3 @ 102.5kg
        nextTargetReps = targetPattern[Math.min(index, targetPattern.length - 1)];
      }

      newExSets.push({
        ...createEmptySet(exercise.type),
        weight: nextWeight,
        reps: nextTargetReps,
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
          // For new empty sets, determine reps.
          // If comma pattern, continue the pattern based on NEW total index
          const totalIndex = currentNormalCount + k;
          let fillReps = minReps;
          if (exercise.targetReps?.includes(",")) {
            fillReps = targetPattern[Math.min(totalIndex, targetPattern.length - 1)];
          }

          newExSets.push({
            ...createEmptySet(exercise.type),
            weight: nextWeight,
            reps: fillReps,
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
        oldReps: targetPattern[0], // approximate for display
        newWeight: nextWeight,
        newReps: targetPattern[0], // approximate for display
        type: "PROMOTION"
      },
      applied: true
    };
  } else if (lastNormalWeight) {
    // RESET: Keep weight, set reps to Target (min reps or pattern)
    normalSets.forEach((s, index) => {
      let nextTargetReps = minReps;
      if (exercise.targetReps?.includes(",")) {
        nextTargetReps = targetPattern[Math.min(index, targetPattern.length - 1)];
      }

      newExSets.push({
        ...createEmptySet(exercise.type),
        weight: s.weight,
        reps: nextTargetReps,
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
          const totalIndex = currentNormalCount + k;
          let fillReps = minReps;
          if (exercise.targetReps?.includes(",")) {
            fillReps = targetPattern[Math.min(totalIndex, targetPattern.length - 1)];
          }
          newExSets.push({
            ...createEmptySet(exercise.type),
            weight: lastNormalWeight,
            reps: fillReps,
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
      failureReason: `Did not hit target reps on all sets`
    };
  } else {
    // Fallback
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
