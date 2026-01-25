import { describe, expect, it } from "vitest";
import type { ExerciseForProgression, WorkoutSet } from "./progressive-overload";
import { applyProgressiveOverload } from "./progressive-overload";

describe("applyProgressiveOverload", () => {
  const baseExercise: ExerciseForProgression = {
    id: "ex1",
    name: "Squat",
    type: "WEIGHT",
    targetReps: "8",
    targetSets: "3",
    incrementValue: 2.5
  };

  it("should promote standard weight (success)", () => {
    const lastSets: WorkoutSet[] = [
      { weight: 100, reps: 8, completed: true, type: "NORMAL" },
      { weight: 100, reps: 8, completed: true, type: "NORMAL" },
      { weight: 100, reps: 8, completed: true, type: "NORMAL" }
    ];

    const result = applyProgressiveOverload(baseExercise, lastSets);

    expect(result.applied).toBe(true);
    expect(result.diff?.type).toBe("PROMOTION");
    expect(result.diff?.newWeight).toBe(102.5);
    // Standard promotions reset to min reps logic (8-12 -> 8, here 8->8)
    expect(result.newSets[0].weight).toBe(102.5);
  });

  it("should reset standard weight (failure)", () => {
    const lastSets: WorkoutSet[] = [
      { weight: 100, reps: 8, completed: true, type: "NORMAL" },
      { weight: 100, reps: 7, completed: true, type: "NORMAL" }, // Failed set
      { weight: 100, reps: 6, completed: true, type: "NORMAL" }
    ];

    const result = applyProgressiveOverload(baseExercise, lastSets);

    expect(result.applied).toBe(true);
    expect(result.diff?.type).toBe("RESET");
    expect(result.diff?.newWeight).toBe(100);
    expect(result.newSets[0].weight).toBe(100);
  });

  // --- Comma Separated Reps Tests ---

  it("should promote comma-separated targets (success) and preserve pattern", () => {
    const csvExercise: ExerciseForProgression = {
      ...baseExercise,
      targetReps: "8,5,3"
    };

    const lastSets: WorkoutSet[] = [
      { weight: 100, reps: 8, completed: true, type: "NORMAL" }, // Target 8
      { weight: 100, reps: 6, completed: true, type: "NORMAL" }, // Target 5 (6 > 5 OK)
      { weight: 100, reps: 3, completed: true, type: "NORMAL" } // Target 3
    ];

    const result = applyProgressiveOverload(csvExercise, lastSets);

    expect(result.applied).toBe(true);
    expect(result.diff?.type).toBe("PROMOTION");
    expect(result.diff?.newWeight).toBe(102.5);

    // Check if new sets match the "8, 5, 3" pattern
    expect(result.newSets[0].reps).toBe(8);
    expect(result.newSets[1].reps).toBe(5);
    expect(result.newSets[2].reps).toBe(3);
  });

  it("should reset comma-separated targets (failure) and preserve pattern", () => {
    const csvExercise: ExerciseForProgression = {
      ...baseExercise,
      targetReps: "8,5,3"
    };

    const lastSets: WorkoutSet[] = [
      { weight: 100, reps: 8, completed: true, type: "NORMAL" },
      { weight: 100, reps: 4, completed: true, type: "NORMAL" }, // Target 5 (Failed)
      { weight: 100, reps: 3, completed: true, type: "NORMAL" }
    ];

    const result = applyProgressiveOverload(csvExercise, lastSets);

    expect(result.applied).toBe(true);
    expect(result.diff?.type).toBe("RESET");
    expect(result.diff?.newWeight).toBe(100);

    // Keep pattern 8,5,3
    expect(result.newSets[0].reps).toBe(8);
    expect(result.newSets[1].reps).toBe(5);
    expect(result.newSets[2].reps).toBe(3);
  });

  it("should handle comma-separated with fewer sets than targets", () => {
    const csvExercise: ExerciseForProgression = {
      ...baseExercise,
      targetReps: "8,5,3"
    };

    // Only did 2 sets
    const lastSets: WorkoutSet[] = [
      { weight: 100, reps: 8, completed: true, type: "NORMAL" },
      { weight: 100, reps: 5, completed: true, type: "NORMAL" }
    ];

    const result = applyProgressiveOverload(csvExercise, lastSets);

    // Should promote because the sets we DID do met the targets for their index?
    // Current logic: every(set => set.reps >= target). So valid sets match.
    expect(result.applied).toBe(true);
    expect(result.diff?.type).toBe("PROMOTION");

    // If we only did 2 sets, but targetSets is 3 (inherited from baseExercise),
    // logic should fill the 3rd set.
    expect(result.newSets).toHaveLength(3);
    // And 3rd set should follow pattern (target index 2 -> 3 reps)
    expect(result.newSets[2].reps).toBe(3);
  });

  // --- Negative Weights Tests (Assisted Machines) ---

  it("should promote negative weights correctly (closer to 0 is harder)", () => {
    // Scenario: -50kg (assisted). Target 8 reps.
    // If we do 8 reps, we want to go up in difficulty.
    // Difficulty up means LESS assistance. -50 -> -47.5.
    // -50 + 2.5 = -47.5. Standard addition works!

    const assistedExercise: ExerciseForProgression = {
      ...baseExercise,
      incrementValue: 2.5
    };

    const lastSets: WorkoutSet[] = [
      { weight: -50, reps: 8, completed: true, type: "NORMAL" },
      { weight: -50, reps: 8, completed: true, type: "NORMAL" },
      { weight: -50, reps: 8, completed: true, type: "NORMAL" }
    ];

    const result = applyProgressiveOverload(assistedExercise, lastSets);

    expect(result.applied).toBe(true);
    expect(result.diff?.type).toBe("PROMOTION"); // "Promotion" means level up
    expect(result.diff?.oldWeight).toBe(-50);
    expect(result.diff?.newWeight).toBe(-47.5);
    expect(result.newSets[0].weight).toBe(-47.5);
  });

  it("should reset negative weights correctly (failure keeps same)", () => {
    const assistedExercise: ExerciseForProgression = {
      ...baseExercise,
      incrementValue: 2.5
    };

    const lastSets: WorkoutSet[] = [
      { weight: -50, reps: 8, completed: true, type: "NORMAL" },
      { weight: -50, reps: 5, completed: true, type: "NORMAL" }, // Fail
      { weight: -50, reps: 8, completed: true, type: "NORMAL" }
    ];

    const result = applyProgressiveOverload(assistedExercise, lastSets);

    expect(result.applied).toBe(true);
    expect(result.diff?.type).toBe("RESET");
    expect(result.diff?.newWeight).toBe(-50);
    expect(result.newSets[0].weight).toBe(-50);
  });
});
