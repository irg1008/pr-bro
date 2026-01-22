import { describe, expect, it } from "vitest";
import {
  applyProgressiveOverload,
  createEmptySet,
  type ExerciseForProgression
} from "./progressive-overload";

describe("createEmptySet", () => {
  it("creates empty WEIGHT set by default", () => {
    const set = createEmptySet();
    expect(set).toEqual({
      weight: "",
      reps: "",
      completed: false,
      type: "NORMAL"
    });
  });

  it("creates empty CARDIO set", () => {
    const set = createEmptySet("CARDIO");
    expect(set).toEqual({
      duration: "",
      distance: "",
      calories: "",
      completed: false,
      type: "NORMAL"
    });
  });
});

describe("applyProgressiveOverload", () => {
  const baseExercise: ExerciseForProgression = {
    id: "ex1",
    name: "Bench Press",
    type: "WEIGHT",
    targetReps: "8-12",
    targetSets: "3",
    incrementValue: 2.5
  };

  describe("when no target reps defined", () => {
    it("returns not applied with failure reason", () => {
      const exercise = { ...baseExercise, targetReps: null };
      const result = applyProgressiveOverload(exercise, []);

      expect(result.applied).toBe(false);
      expect(result.failureReason).toBe("No target reps defined");
      expect(result.newSets).toHaveLength(0);
    });
  });

  describe("when no history", () => {
    it("returns not applied with failure reason", () => {
      const result = applyProgressiveOverload(baseExercise, []);

      expect(result.applied).toBe(false);
      expect(result.failureReason).toBe("No history found");
    });
  });

  describe("PROMOTION case (all normal sets hit max reps)", () => {
    it("increases weight and resets reps to min for normal sets", () => {
      const lastSets = [
        { weight: 60, reps: 12, type: "NORMAL" },
        { weight: 60, reps: 12, type: "NORMAL" },
        { weight: 60, reps: 12, type: "NORMAL" }
      ];

      const result = applyProgressiveOverload(baseExercise, lastSets);

      expect(result.applied).toBe(true);
      expect(result.diff?.type).toBe("PROMOTION");
      expect(result.diff?.oldWeight).toBe(60);
      expect(result.diff?.newWeight).toBe(62.5);
      expect(result.diff?.newReps).toBe(8);

      // All sets should have new weight and min reps
      expect(result.newSets).toHaveLength(3);
      result.newSets.forEach((set) => {
        expect(set.weight).toBe(62.5);
        expect(set.reps).toBe(8);
        expect(set.type).toBe("NORMAL");
      });
    });

    it("preserves warmup sets exactly as they were", () => {
      const lastSets = [
        { weight: 30, reps: 10, type: "WARMUP" },
        { weight: 45, reps: 8, type: "WARMUP" },
        { weight: 60, reps: 12, type: "NORMAL" },
        { weight: 60, reps: 12, type: "NORMAL" },
        { weight: 60, reps: 12, type: "NORMAL" }
      ];

      const result = applyProgressiveOverload(baseExercise, lastSets);

      expect(result.applied).toBe(true);
      expect(result.newSets).toHaveLength(5);

      // Check warmup sets are preserved
      expect(result.newSets[0]).toMatchObject({
        weight: 30,
        reps: 10,
        type: "WARMUP"
      });
      expect(result.newSets[1]).toMatchObject({
        weight: 45,
        reps: 8,
        type: "WARMUP"
      });

      // Check normal sets are overloaded
      expect(result.newSets[2]).toMatchObject({
        weight: 62.5,
        reps: 8,
        type: "NORMAL"
      });
    });

    it("excludes FAILURE, DROPSET, and other non-standard set types", () => {
      const lastSets = [
        { weight: 30, reps: 10, type: "WARMUP" },
        { weight: 60, reps: 12, type: "NORMAL" },
        { weight: 60, reps: 12, type: "NORMAL" },
        { weight: 50, reps: 8, type: "FAILURE" },
        { weight: 40, reps: 10, type: "DROPSET" }
      ];

      const result = applyProgressiveOverload(baseExercise, lastSets);

      expect(result.applied).toBe(true);
      // Should have 1 warmup + 3 normal (2 from history + 1 filled to meet targetSets:3)
      // NOT the failure/dropset
      expect(result.newSets).toHaveLength(4);

      expect(result.newSets[0].type).toBe("WARMUP");
      expect(result.newSets[1].type).toBe("NORMAL");
      expect(result.newSets[2].type).toBe("NORMAL");
      expect(result.newSets[3].type).toBe("NORMAL");

      // No FAILURE or DROPSET types should exist
      const hasFailure = result.newSets.some((s) => s.type === "FAILURE");
      const hasDropset = result.newSets.some((s) => s.type === "DROPSET");
      expect(hasFailure).toBe(false);
      expect(hasDropset).toBe(false);
    });

    it("fills sets to meet target set count", () => {
      const exercise = { ...baseExercise, targetSets: "4" };
      const lastSets = [
        { weight: 60, reps: 12, type: "NORMAL" },
        { weight: 60, reps: 12, type: "NORMAL" }
      ];

      const result = applyProgressiveOverload(exercise, lastSets);

      expect(result.applied).toBe(true);
      // Should fill to 4 normal sets
      expect(result.newSets).toHaveLength(4);
      result.newSets.forEach((set) => {
        expect(set.weight).toBe(62.5);
        expect(set.type).toBe("NORMAL");
      });
    });

    it("uses custom increment value", () => {
      const exercise = { ...baseExercise, incrementValue: 5 };
      const lastSets = [{ weight: 60, reps: 12, type: "NORMAL" }];

      const result = applyProgressiveOverload(exercise, lastSets);

      expect(result.diff?.newWeight).toBe(65);
      expect(result.newSets[0].weight).toBe(65);
    });

    it("uses default increment of 2.5 when not specified", () => {
      const exercise = { ...baseExercise, incrementValue: null };
      const lastSets = [{ weight: 60, reps: 12, type: "NORMAL" }];

      const result = applyProgressiveOverload(exercise, lastSets);

      expect(result.diff?.newWeight).toBe(62.5);
    });
  });

  describe("RESET case (not all normal sets hit max reps)", () => {
    it("keeps same weight but resets reps to min", () => {
      const lastSets = [
        { weight: 60, reps: 12, type: "NORMAL" },
        { weight: 60, reps: 10, type: "NORMAL" }, // Did not hit 12
        { weight: 60, reps: 8, type: "NORMAL" }
      ];

      const result = applyProgressiveOverload(baseExercise, lastSets);

      expect(result.applied).toBe(true);
      expect(result.diff?.type).toBe("RESET");
      expect(result.diff?.oldWeight).toBe(60);
      expect(result.diff?.newWeight).toBe(60); // Same weight

      result.newSets.forEach((set) => {
        expect(set.weight).toBe(60);
        expect(set.reps).toBe(8); // Min reps
        expect(set.type).toBe("NORMAL");
      });
    });

    it("still preserves warmup sets in reset case", () => {
      const lastSets = [
        { weight: 30, reps: 10, type: "WARMUP" },
        { weight: 60, reps: 10, type: "NORMAL" } // Did not hit 12
      ];

      const result = applyProgressiveOverload(baseExercise, lastSets);

      expect(result.applied).toBe(true);
      // 1 warmup + 3 normal (1 from history + 2 filled to meet targetSets:3)
      expect(result.newSets).toHaveLength(4);

      expect(result.newSets[0]).toMatchObject({
        weight: 30,
        reps: 10,
        type: "WARMUP"
      });
    });

    it("still excludes failure/dropset in reset case", () => {
      const lastSets = [
        { weight: 60, reps: 10, type: "NORMAL" },
        { weight: 50, reps: 15, type: "FAILURE" }
      ];

      const result = applyProgressiveOverload(baseExercise, lastSets);

      // Should only have normal sets, not failure
      const normalSets = result.newSets.filter((s) => s.type === "NORMAL");
      const failureSets = result.newSets.filter((s) => s.type === "FAILURE");

      expect(normalSets.length).toBeGreaterThan(0);
      expect(failureSets).toHaveLength(0);
    });
  });

  describe("single rep target (not a range)", () => {
    it("uses the single value as both min and max", () => {
      const exercise = { ...baseExercise, targetReps: "10" };
      const lastSets = [{ weight: 60, reps: 10, type: "NORMAL" }];

      const result = applyProgressiveOverload(exercise, lastSets);

      expect(result.applied).toBe(true);
      expect(result.diff?.type).toBe("PROMOTION");
      expect(result.diff?.newReps).toBe(10);
    });
  });

  describe("edge cases", () => {
    it("handles sets without type field (treats as NORMAL)", () => {
      const lastSets = [
        { weight: 60, reps: 12 }, // No type field
        { weight: 60, reps: 12 }
      ];

      const result = applyProgressiveOverload(baseExercise, lastSets);

      expect(result.applied).toBe(true);
      expect(result.diff?.type).toBe("PROMOTION");
    });

    it("handles no weight recorded", () => {
      const lastSets = [{ weight: undefined, reps: 12, type: "NORMAL" }];

      const result = applyProgressiveOverload(baseExercise, lastSets);

      expect(result.applied).toBe(false);
      expect(result.failureReason).toBe("Last run had no weight recorded");
    });

    it("handles only warmup sets (no normal sets)", () => {
      const lastSets = [
        { weight: 30, reps: 10, type: "WARMUP" },
        { weight: 45, reps: 8, type: "WARMUP" }
      ];

      const result = applyProgressiveOverload(baseExercise, lastSets);

      expect(result.applied).toBe(false);
      // Warmups are copied but no normal sets to overload
      expect(result.newSets[0].type).toBe("WARMUP");
      expect(result.newSets[1].type).toBe("WARMUP");
    });
  });
});
