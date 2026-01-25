import { WorkoutService } from "@/services/workout-service";
import { defineAction } from "astro:actions";
import { z } from "astro:schema";

const SetSchema = z.object({
  weight: z.union([z.number(), z.string(), z.literal("")]).optional(),
  reps: z.union([z.number(), z.string(), z.literal("")]).optional(),
  duration: z.union([z.number(), z.string(), z.literal("")]).optional(),
  distance: z.union([z.number(), z.string(), z.literal("")]).optional(),
  calories: z.union([z.number(), z.string(), z.literal("")]).optional(),
  completed: z.boolean(),
  type: z.string().optional()
});

export const workout = {
  start: defineAction({
    input: z.object({
      routineId: z.string(),
      createdAt: z.string().optional()
    }),
    handler: async ({ routineId, createdAt }) => {
      return await WorkoutService.startWorkout(routineId, createdAt);
    }
  }),

  updateSession: defineAction({
    input: z.object({
      id: z.string(),
      entries: z.record(z.array(SetSchema)).optional(),
      supersetStatus: z.record(z.boolean()).optional(),
      sessionNotes: z.record(z.string()).optional(),
      exerciseOrder: z.array(z.string()).optional(),
      isDeload: z.boolean().optional(),
      createdAt: z.string().optional(),
      finishedAt: z.string().nullable().optional()
    }),
    handler: async ({ id, ...data }) => {
      // @ts-ignore - sets are complex but compatible
      return await WorkoutService.updateSession(id, data);
    }
  }),

  finish: defineAction({
    input: z.object({
      id: z.string(),
      entries: z.record(z.array(SetSchema)),
      supersetStatus: z.record(z.boolean()).optional(),
      notes: z.record(z.string()).optional(),
      isDeload: z.boolean().optional()
    }),
    handler: async ({ id, ...data }) => {
      // @ts-ignore
      return await WorkoutService.finishWorkout(id, data);
    }
  }),

  cancel: defineAction({
    input: z.object({ id: z.string() }),
    handler: async ({ id }) => {
      return await WorkoutService.cancelWorkout(id);
    }
  }),

  delete: defineAction({
    input: z.object({ id: z.string() }),
    handler: async ({ id }) => {
      return await WorkoutService.cancelWorkout(id);
    }
  }),

  reset: defineAction({
    input: z.object({ id: z.string() }),
    handler: async ({ id }) => {
      return await WorkoutService.resetWorkout(id);
    }
  }),

  applyOverload: defineAction({
    input: z.object({
      logId: z.string(),
      exerciseId: z.string().optional()
    }),
    handler: async ({ logId, exerciseId }) => {
      return await WorkoutService.applyOverload(logId, exerciseId);
    }
  }),

  getLastRoutineRun: defineAction({
    input: z.object({ logId: z.string() }),
    handler: async ({ logId }) => {
      return await WorkoutService.getLastRoutineRun(logId);
    }
  }),

  deleteAllLogs: defineAction({
    handler: async () => {
      return await WorkoutService.deleteAllLogs();
    }
  })
};
