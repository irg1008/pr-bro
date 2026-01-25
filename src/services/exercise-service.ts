import { db as prisma } from "@/lib/db";
import type { Exercise, Prisma } from "prisma/generated/client";

export class ExerciseService {
  /**
   * Get paginated exercises with optional search and category filters.
   * Supports prioritization of specific categories.
   */
  static async getExercises({
    page = 1,
    limit = 20,
    search = "",
    category = "",
    prioritize = []
  }: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    prioritize?: string[];
  }) {
    const skip = (page - 1) * limit;
    const baseWhere: Prisma.ExerciseWhereInput = {};

    if (search) {
      baseWhere.name = { contains: search, mode: "insensitive" };
    }

    if (category) {
      baseWhere.category = category;
      const [exercises, total] = await Promise.all([
        prisma.exercise.findMany({
          where: baseWhere,
          take: limit,
          skip,
          orderBy: { name: "asc" }
        }),
        prisma.exercise.count({ where: baseWhere })
      ]);

      return {
        exercises,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    }

    // Handle Prioritization logic (from pages/api/exercises.ts)
    if (prioritize.length > 0) {
      const priorityWhere: Prisma.ExerciseWhereInput = {
        ...baseWhere,
        category: { in: prioritize }
      };
      const standardWhere: Prisma.ExerciseWhereInput = {
        ...baseWhere,
        NOT: { category: { in: prioritize } }
      };

      const pCount = await prisma.exercise.count({ where: priorityWhere });
      const total = await prisma.exercise.count({ where: baseWhere });

      let exercises: any[] = [];

      if (skip < pCount) {
        const takeFromP = Math.min(limit, pCount - skip);
        const pExercises = await prisma.exercise.findMany({
          where: priorityWhere,
          take: takeFromP,
          skip: skip,
          orderBy: { name: "asc" }
        });

        exercises = [...pExercises];

        const remainingLimit = limit - pExercises.length;
        if (remainingLimit > 0) {
          const sExercises = await prisma.exercise.findMany({
            where: standardWhere,
            take: remainingLimit,
            skip: 0,
            orderBy: { name: "asc" }
          });
          exercises = [...exercises, ...sExercises];
        }
      } else {
        const adjustedSkip = skip - pCount;
        exercises = await prisma.exercise.findMany({
          where: standardWhere,
          take: limit,
          skip: adjustedSkip,
          orderBy: { name: "asc" }
        });
      }

      return {
        exercises,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    }

    // Standard Fetch
    const [exercises, total] = await Promise.all([
      prisma.exercise.findMany({
        where: baseWhere,
        take: limit,
        skip,
        orderBy: { name: "asc" }
      }),
      prisma.exercise.count({ where: baseWhere })
    ]);

    return {
      exercises,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  static async getExerciseById(id: string) {
    return prisma.exercise.findUnique({
      where: { id }
    });
  }

  static async createExercise(data: {
    name: string;
    category?: string;
    target?: string;
    imageUrl?: string;
    equipment?: string;
    secondaryMuscles?: string[];
    instructions?: string[];
  }) {
    const { name, category, target, imageUrl, equipment, secondaryMuscles, instructions } = data;

    // Check for existing
    const existing = await prisma.exercise.findFirst({
      where: { name: { equals: name, mode: "insensitive" } }
    });

    if (existing) {
      throw new Error("An exercise with this name already exists");
    }

    return prisma.exercise.create({
      data: {
        name,
        category: category || "Other",
        bodyPart: category ? category.toLowerCase() : "other",
        target: target || null,
        equipment: equipment || null,
        imageUrl: imageUrl || null,
        secondaryMuscles: secondaryMuscles || [],
        instructions: instructions || []
      }
    });
  }

  static async updateExercise(
    id: string,
    data: Partial<{
      name: string;
      category: string;
      target: string;
      imageUrl: string;
      equipment: string;
      secondaryMuscles: string[];
      instructions: string[];
    }>
  ) {
    return prisma.exercise.update({
      where: { id },
      data: {
        ...data,
        bodyPart: data.category ? data.category.toLowerCase() : undefined
      }
    });
  }

  static async deleteExercise(id: string) {
    return prisma.exercise.delete({
      where: { id }
    });
  }

  /**
   * Get unique values for a specific field (e.g., categories, targets).
   */
  static async getUniqueValues(
    field: Extract<keyof Exercise, "category" | "target" | "equipment">
  ) {
    const results = await prisma.exercise.findMany({
      select: { [field]: true },
      distinct: [field]
    });

    return results
      .map((r) => r[field] as unknown)
      .filter((v): v is string => typeof v === "string" && v.length > 0)
      .sort();
  }
}
