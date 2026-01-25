import { ExerciseService } from "@/services/exercise-service";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";

export const exercise = {
  getExercises: defineAction({
    input: z.object({
      page: z.number().optional(),
      limit: z.number().optional(),
      search: z.string().optional(),
      category: z.string().optional(),
      prioritize: z.array(z.string()).optional()
    }),
    handler: async (input) => {
      return await ExerciseService.getExercises(input);
    }
  }),

  getUniqueValues: defineAction({
    input: z.object({
      field: z.enum(["category", "target", "equipment"])
    }),
    handler: async ({ field }) => {
      return await ExerciseService.getUniqueValues(field);
    }
  }),

  getCategories: defineAction({
    handler: async () => {
      return await ExerciseService.getUniqueValues("category");
    }
  }),

  createExercise: defineAction({
    input: z.object({
      name: z.string(),
      category: z.string().optional(),
      target: z.string().optional(),
      imageUrl: z.string().optional(),
      equipment: z.string().optional(),
      secondaryMuscles: z.array(z.string()).optional(),
      instructions: z.array(z.string()).optional()
    }),
    handler: async (input) => {
      try {
        return await ExerciseService.createExercise(input);
      } catch (e: any) {
        throw new ActionError({
          code: "CONFLICT",
          message: e.message
        });
      }
    }
  }),

  updateExercise: defineAction({
    input: z.object({
      id: z.string(),
      name: z.string().optional(),
      category: z.string().optional(),
      target: z.string().optional(),
      imageUrl: z.string().optional(),
      equipment: z.string().optional(),
      secondaryMuscles: z.array(z.string()).optional(),
      instructions: z.array(z.string()).optional()
    }),
    handler: async ({ id, ...data }) => {
      return await ExerciseService.updateExercise(id, data);
    }
  }),

  deleteExercise: defineAction({
    input: z.object({
      id: z.string()
    }),
    handler: async ({ id }) => {
      return await ExerciseService.deleteExercise(id);
    }
  })
};
