import { db as prisma } from "@/lib/db";

export class RoutineService {
  // --- Routine Groups ---

  static async getGroups() {
    return prisma.routineGroup.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { routines: true }
        }
      }
    });
  }

  static async getGroupById(id: string) {
    return prisma.routineGroup.findUnique({
      where: { id },
      include: {
        routines: {
          orderBy: { order: "asc" },
          include: {
            exercises: {
              include: { exercise: true },
              orderBy: { order: "asc" }
            }
          }
        }
      }
    });
  }

  static async createGroup(data: { name: string; description?: string }) {
    return prisma.routineGroup.create({
      data
    });
  }

  static async updateGroup(id: string, data: { name?: string; description?: string }) {
    return prisma.routineGroup.update({
      where: { id },
      data
    });
  }

  static async deleteGroup(id: string) {
    // Manual cascade as per current API implementation
    const routines = await prisma.routine.findMany({ where: { routineGroupId: id } });

    for (const routine of routines) {
      await prisma.workoutLogEntry.deleteMany({ where: { workoutLog: { routineId: routine.id } } });
      await prisma.workoutLog.deleteMany({ where: { routineId: routine.id } });
      await prisma.routineExercise.deleteMany({ where: { routineId: routine.id } });
    }

    await prisma.routine.deleteMany({ where: { routineGroupId: id } });
    return prisma.routineGroup.delete({ where: { id } });
  }

  static async setActiveGroup(groupId: string) {
    return prisma.$transaction([
      prisma.routineGroup.updateMany({ data: { isActive: false } }),
      prisma.routineGroup.update({
        where: { id: groupId },
        data: { isActive: true }
      })
    ]);
  }

  static async getActiveGroup() {
    return prisma.routineGroup.findFirst({
      where: { isActive: true },
      include: {
        routines: {
          include: {
            exercises: {
              include: { exercise: true },
              orderBy: { order: "asc" }
            }
          },
          orderBy: [{ order: "asc" }, { createdAt: "asc" }]
        }
      }
    });
  }

  // --- Routines ---

  static async createRoutine(data: {
    name: string;
    description?: string;
    routineGroupId: string;
    focusedParts?: string[];
  }) {
    const count = await prisma.routine.count({
      where: { routineGroupId: data.routineGroupId }
    });

    return prisma.routine.create({
      data: {
        ...data,
        order: count
      }
    });
  }

  static async updateRoutine(
    id: string,
    data: {
      name?: string;
      description?: string;
      focusedParts?: string[];
      isDeload?: boolean;
    }
  ) {
    return prisma.routine.update({
      where: { id },
      data
    });
  }

  static async deleteRoutine(id: string) {
    // Should also probably handle cascade if not in DB schema
    await prisma.routineExercise.deleteMany({ where: { routineId: id } });
    await prisma.workoutLogEntry.deleteMany({ where: { workoutLog: { routineId: id } } });
    await prisma.workoutLog.deleteMany({ where: { routineId: id } });

    return prisma.routine.delete({
      where: { id }
    });
  }

  static async reorderRoutines(routineIds: string[]) {
    return prisma.$transaction(
      routineIds.map((id, index) =>
        prisma.routine.update({
          where: { id },
          data: { order: index }
        })
      )
    );
  }

  // --- Routine Exercises (Assignments) ---

  static async addExerciseToRoutine(data: {
    routineId: string;
    exerciseId: string;
    targetSets?: string;
    targetReps?: string;
    targetType?: "REPS" | "DURATION";
    targetRepsToFailure?: string;
    incrementValue?: number;
    note?: string;
  }) {
    const lastItem = await prisma.routineExercise.findFirst({
      where: { routineId: data.routineId },
      orderBy: { order: "desc" }
    });
    const newOrder = (lastItem?.order ?? -1) + 1;

    return prisma.routineExercise.create({
      data: {
        ...data,
        order: newOrder
      },
      include: { exercise: true }
    });
  }

  static async updateRoutineExercise(
    id: string,
    data: {
      isActive?: boolean;
      isSuperset?: boolean;
      note?: string | null;
      targetSets?: string | null;
      targetReps?: string | null;
      targetType?: "REPS" | "DURATION";
      targetRepsToFailure?: string | null;
      incrementValue?: number | null;
      order?: number;
    }
  ) {
    return prisma.routineExercise.update({
      where: { id },
      data
    });
  }

  static async removeExerciseFromRoutine(id: string) {
    return prisma.routineExercise.delete({
      where: { id }
    });
  }

  static async reorderRoutineExercises(routineExerciseIds: string[]) {
    return prisma.$transaction(
      routineExerciseIds.map((id, index) =>
        prisma.routineExercise.update({
          where: { id },
          data: { order: index }
        })
      )
    );
  }

  static async backupImport(groups: any[]) {
    const results = [];
    for (const group of groups) {
      const existing = await prisma.routineGroup.findUnique({ where: { id: group.id } });
      if (!existing) {
        const { routines, _count, ...groupData } = group;
        const _createdGroup = await prisma.routineGroup.create({ data: groupData });
        results.push({ name: group.name, status: "imported" });

        if (routines) {
          for (const routine of routines) {
            const { exercises, ...routineData } = routine;
            await prisma.routine.create({ data: routineData });
            if (exercises) {
              await prisma.routineExercise.createMany({ data: exercises });
            }
          }
        }
      } else {
        results.push({ name: group.name, status: "skipped" });
      }
    }
    return results;
  }
}
