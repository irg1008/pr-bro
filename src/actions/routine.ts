import { RoutineService } from "@/services/routine-service";
import { defineAction } from "astro:actions";
import { z } from "astro:schema";

export const routine = {
  // Groups
  createGroup: defineAction({
    input: z.object({
      name: z.string(),
      description: z.string().optional()
    }),
    handler: async (input) => {
      return await RoutineService.createGroup(input);
    }
  }),

  updateGroup: defineAction({
    input: z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional()
    }),
    handler: async ({ id, ...data }) => {
      return await RoutineService.updateGroup(id, data);
    }
  }),

  deleteGroup: defineAction({
    input: z.object({ id: z.string() }),
    handler: async ({ id }) => {
      return await RoutineService.deleteGroup(id);
    }
  }),

  setActiveGroup: defineAction({
    input: z.object({ groupId: z.string() }),
    handler: async ({ groupId }) => {
      return await RoutineService.setActiveGroup(groupId);
    }
  }),

  // Routines
  createRoutine: defineAction({
    input: z.object({
      name: z.string(),
      description: z.string().optional(),
      routineGroupId: z.string(),
      focusedParts: z.array(z.string()).optional()
    }),
    handler: async (input) => {
      return await RoutineService.createRoutine(input);
    }
  }),

  updateRoutine: defineAction({
    input: z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      focusedParts: z.array(z.string()).optional(),
      isDeload: z.boolean().optional()
    }),
    handler: async ({ id, ...data }) => {
      return await RoutineService.updateRoutine(id, data);
    }
  }),

  deleteRoutine: defineAction({
    input: z.object({ id: z.string() }),
    handler: async ({ id }) => {
      return await RoutineService.deleteRoutine(id);
    }
  }),

  reorderRoutines: defineAction({
    input: z.object({ routineIds: z.array(z.string()) }),
    handler: async ({ routineIds }) => {
      return await RoutineService.reorderRoutines(routineIds);
    }
  }),

  // Routine Exercises
  addExercise: defineAction({
    input: z.object({
      routineId: z.string(),
      exerciseId: z.string(),
      targetSets: z.string().optional(),
      targetReps: z.string().optional(),
      targetType: z.enum(["REPS", "DURATION"]).optional(),
      targetRepsToFailure: z.string().optional(),
      incrementValue: z.number().optional(),
      note: z.string().optional()
    }),
    handler: async (input) => {
      return await RoutineService.addExerciseToRoutine(input);
    }
  }),

  updateExerciseAssignment: defineAction({
    input: z.object({
      id: z.string(),
      data: z.object({
        isActive: z.boolean().optional(),
        isSuperset: z.boolean().optional(),
        note: z.string().nullable().optional(),
        targetSets: z.string().nullable().optional(),
        targetReps: z.string().nullable().optional(),
        targetType: z.enum(["REPS", "DURATION"]).optional(),
        targetRepsToFailure: z.string().nullable().optional(),
        incrementValue: z.number().nullable().optional(),
        order: z.number().optional()
      })
    }),
    handler: async ({ id, data }) => {
      return await RoutineService.updateRoutineExercise(id, data);
    }
  }),

  removeExercise: defineAction({
    input: z.object({ id: z.string() }),
    handler: async ({ id }) => {
      return await RoutineService.removeExerciseFromRoutine(id);
    }
  }),

  reorderExercises: defineAction({
    input: z.object({ routineExerciseIds: z.array(z.string()) }),
    handler: async ({ routineExerciseIds }) => {
      return await RoutineService.reorderRoutineExercises(routineExerciseIds);
    }
  }),

  importBackup: defineAction({
    input: z.array(z.any()),
    handler: async (groups) => {
      return await RoutineService.backupImport(groups);
    }
  })
};
