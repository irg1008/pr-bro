import { db as prisma } from "@/lib/db";
import { applyProgressiveOverload, type WorkoutSet } from "@/lib/progressive-overload";
import type { Prisma } from "prisma/generated/client";

export class WorkoutService {
  /**
   * Get all workout logs with routine and group info.
   */
  static async getWorkoutLogs() {
    return prisma.workoutLog.findMany({
      include: {
        routine: {
          include: { group: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  static async getWorkoutLogById(id: string) {
    return prisma.workoutLog.findUnique({
      where: { id },
      include: {
        routine: {
          include: { group: true, exercises: { include: { exercise: true } } }
        },
        entries: {
          include: { exercise: true },
          orderBy: { order: "asc" }
        }
      }
    });
  }

  /**
   * Check for an active (unfinished) workout log.
   */
  static async getActiveWorkoutLog() {
    return prisma.workoutLog.findFirst({
      where: { finishedAt: null },
      include: {
        entries: {
          include: { exercise: true },
          orderBy: { order: "asc" }
        },
        routine: true
      },
      orderBy: { createdAt: "desc" }
    });
  }

  /**
   * Start a new workout session.
   * Calculates cycle number automatically.
   */
  static async startWorkout(routineId: string, createdAt?: string) {
    // 1. Fetch Routine info
    const currentRoutine = await prisma.routine.findUnique({
      where: { id: routineId },
      include: {
        group: true,
        exercises: {
          include: { exercise: true },
          orderBy: { order: "asc" }
        }
      }
    });

    if (!currentRoutine) throw new Error("Routine not found");

    // 2. Calculate Cycle Number
    let cycleNumber = 1;
    const lastLog = await prisma.workoutLog.findFirst({
      where: {
        routine: {
          routineGroupId: currentRoutine.routineGroupId
        }
      },
      orderBy: { createdAt: "desc" }
    });

    if (lastLog) {
      const currentCycleNum = lastLog.cycleNumber || 1;
      const existingRoutineInCycle = await prisma.workoutLog.findFirst({
        where: {
          routineId: routineId,
          cycleNumber: currentCycleNum
        }
      });

      cycleNumber = existingRoutineInCycle ? currentCycleNum + 1 : currentCycleNum;
    }

    // 3. Prepare initial entries
    const initialEntries = currentRoutine.exercises
      .filter((re) => re.isActive !== false)
      .map((re) => {
        const type = re.exercise.type || "WEIGHT";
        const initialSet =
          type === "CARDIO"
            ? { duration: "", distance: "", completed: false, type: "NORMAL" }
            : { weight: "", reps: "", completed: false, type: "NORMAL" };

        return {
          exerciseId: re.exerciseId,
          sets: [initialSet],
          order: re.order,
          isSuperset: re.isSuperset,
          note: null
        };
      });

    // 4. Create Log
    return prisma.workoutLog.create({
      data: {
        routineId,
        cycleNumber,
        isDeload: currentRoutine.isDeload,
        createdAt: createdAt ? new Date(createdAt) : undefined,
        entries: {
          create: initialEntries
        }
      }
    });
  }

  /**
   * Save session progress without finishing.
   */
  static async updateSession(
    id: string,
    data: {
      entries?: Record<string, WorkoutSet[]>;
      supersetStatus?: Record<string, boolean>;
      sessionNotes?: Record<string, string>;
      exerciseOrder?: string[];
      isDeload?: boolean;
      createdAt?: string;
      finishedAt?: string | null;
    }
  ) {
    const {
      entries,
      supersetStatus,
      sessionNotes,
      exerciseOrder,
      isDeload,
      createdAt,
      finishedAt
    } = data;

    const updateData: Prisma.WorkoutLogUpdateInput = {};
    if (isDeload !== undefined) updateData.isDeload = isDeload;
    if (createdAt !== undefined) updateData.createdAt = createdAt;
    if (finishedAt !== undefined) updateData.finishedAt = finishedAt;

    return prisma.$transaction(async (tx) => {
      if (Object.keys(updateData).length > 0) {
        await tx.workoutLog.update({ where: { id }, data: updateData });
      }

      if (entries) {
        // Sync entries: Delete all existing and recreate
        await tx.workoutLogEntry.deleteMany({ where: { workoutLogId: id } });

        const allExerciseIds = Object.keys(entries);
        const validExercises = await tx.exercise.findMany({
          where: { id: { in: allExerciseIds } },
          select: { id: true }
        });
        const validIdsSet = new Set(validExercises.map((e) => e.id));

        const orderedIds = exerciseOrder || Object.keys(entries);

        const entryCreates = orderedIds
          .filter((exId) => validIdsSet.has(exId) && entries[exId])
          .map((exerciseId, index) => ({
            workoutLogId: id,
            exerciseId,
            sets: entries[exerciseId] as unknown as Prisma.InputJsonValue,
            isSuperset: supersetStatus?.[exerciseId] || false,
            note: sessionNotes?.[exerciseId] || null,
            order: index
          }));

        if (entryCreates.length > 0) {
          await tx.workoutLogEntry.createMany({ data: entryCreates });
        }
      }
    });
  }

  static async finishWorkout(
    id: string,
    data: {
      entries: Record<string, WorkoutSet[]>;
      supersetStatus?: Record<string, boolean>;
      notes?: Record<string, string>;
      isDeload?: boolean;
    }
  ) {
    await this.updateSession(id, {
      entries: data.entries,
      supersetStatus: data.supersetStatus,
      sessionNotes: data.notes,
      isDeload: data.isDeload
    });

    return prisma.workoutLog.update({
      where: { id },
      data: { finishedAt: new Date() }
    });
  }

  static async cancelWorkout(id: string) {
    await prisma.workoutLogEntry.deleteMany({ where: { workoutLogId: id } });
    return prisma.workoutLog.delete({ where: { id } });
  }

  /**
   * Reset workout to routine defaults.
   */
  static async resetWorkout(id: string) {
    const log = await prisma.workoutLog.findUnique({
      where: { id },
      include: {
        routine: {
          include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } }
        }
      }
    });

    if (!log || !log.routine) throw new Error("Log or Routine not found");

    const createEmptySetLocal = (type: string) => {
      if (type === "CARDIO")
        return { duration: "", distance: "", completed: false, type: "NORMAL" };
      return { weight: "", reps: "", completed: false, type: "NORMAL" };
    };

    const activeRoutineExercises = log.routine.exercises.filter((re) => re.isActive !== false);

    const newEntriesData = activeRoutineExercises.map((re) => ({
      workoutLogId: id,
      exerciseId: re.exerciseId,
      order: re.order,
      isSuperset: re.isSuperset,
      note: null,
      sets: [createEmptySetLocal(re.exercise.type)]
    }));

    await prisma.$transaction(async (tx) => {
      await tx.workoutLogEntry.deleteMany({ where: { workoutLogId: id } });
      if (newEntriesData.length > 0) {
        await tx.workoutLogEntry.createMany({ data: newEntriesData });
      }
      await tx.workoutLog.update({ where: { id }, data: { updatedAt: new Date() } });
    });

    const refreshedExercises = activeRoutineExercises.map((re) => ({
      ...re.exercise,
      routineNote: re.note,
      sessionNote: null,
      targetSets: re.targetSets,
      targetReps: re.targetReps,
      targetRepsToFailure: re.targetRepsToFailure
    }));

    const newSupersetStatus: Record<string, boolean> = {};
    activeRoutineExercises.forEach((re) => {
      if (re.isSuperset) newSupersetStatus[re.exerciseId] = true;
    });

    const newSets: Record<string, any[]> = {};
    activeRoutineExercises.forEach((re) => {
      newSets[re.exerciseId] = [createEmptySetLocal(re.exercise.type)];
    });

    return {
      exercises: refreshedExercises,
      supersetStatus: newSupersetStatus,
      sets: newSets
    };
  }

  /**
   * Get the most recent finished run of this routine for the current log's context.
   */
  static async getLastRoutineRun(logId: string) {
    const currentLog = await prisma.workoutLog.findUnique({
      where: { id: logId },
      select: { routineId: true }
    });

    if (!currentLog || !currentLog.routineId) throw new Error("Routine not found");

    const lastLog = await prisma.workoutLog.findFirst({
      where: {
        routineId: currentLog.routineId,
        id: { not: logId },
        finishedAt: { not: null },
        isDeload: false
      },
      orderBy: { finishedAt: "desc" },
      include: { entries: { orderBy: { order: "asc" } } }
    });

    if (!lastLog) return { found: false };

    const sets: Record<string, any[]> = {};
    const notes: Record<string, string> = {};
    const supersets: Record<string, boolean> = {};

    lastLog.entries.forEach((entry) => {
      sets[entry.exerciseId] = entry.sets as unknown as WorkoutSet[];
      if (entry.note) notes[entry.exerciseId] = entry.note;
      if (entry.isSuperset) supersets[entry.exerciseId] = true;
    });

    return {
      found: true,
      data: {
        sets,
        sessionNotes: notes,
        supersetStatus: supersets,
        finishedAt: lastLog.finishedAt
      }
    };
  }

  /**
   * Apply progressive overload to exercise(s) in a workout.
   */
  static async applyOverload(logId: string, exerciseId?: string) {
    const { found, data } = await this.getLastRoutineRun(logId);
    if (!found) return { applied: false, reason: "No history found" };

    const log = await prisma.workoutLog.findUnique({
      where: { id: logId },
      include: {
        routine: {
          include: { exercises: { include: { exercise: true } } }
        }
      }
    });

    if (!log) throw new Error("Log not found");

    const lastRunSets = data!.sets;
    const routineExercises = log.routine.exercises;

    // Filter which exercises to process
    let toProcess = routineExercises;
    if (exerciseId) {
      toProcess = routineExercises.filter((re) => re.exerciseId === exerciseId);
    }

    const results: any[] = [];
    const newSets: Record<string, WorkoutSet[]> = {};

    for (const re of toProcess) {
      const lastSets = lastRunSets[re.exerciseId];
      if (!lastSets) continue;

      const result = applyProgressiveOverload(
        {
          id: re.exerciseId,
          name: re.exercise.name,
          type: re.exercise.type,
          targetReps: re.targetReps,
          targetSets: re.targetSets,
          incrementValue: re.incrementValue || undefined
        },
        lastSets
      );

      if (result.applied) {
        newSets[re.exerciseId] = result.newSets;
        results.push({ exerciseId: re.exerciseId, applied: true, diff: result.diff });
      } else {
        results.push({ exerciseId: re.exerciseId, applied: false, reason: result.failureReason });
      }
    }

    return { results, newSets };
  }

  /**
   * Get data for the home dashboard: active group, next routine, and active log.
   */
  static async getHomeDashboardData() {
    const activeGroup = await prisma.routineGroup.findFirst({
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

    let nextRoutine = null;
    let activeLog = await this.getActiveWorkoutLog();

    if (activeLog) {
      nextRoutine = activeGroup?.routines.find((r) => r.id === activeLog?.routineId) || null;
    } else if (activeGroup && activeGroup.routines.length > 0) {
      const lastLog = await prisma.workoutLog.findFirst({
        where: { routine: { routineGroupId: activeGroup.id } },
        orderBy: { createdAt: "desc" }
      });

      if (!lastLog) {
        nextRoutine = activeGroup.routines[0];
      } else {
        if (!lastLog.finishedAt) {
          nextRoutine =
            activeGroup.routines.find((r) => r.id === lastLog.routineId) || activeGroup.routines[0];
        } else {
          const lastRoutineIndex = activeGroup.routines.findIndex(
            (r) => r.id === lastLog.routineId
          );
          if (lastRoutineIndex === -1) {
            nextRoutine = activeGroup.routines[0];
          } else {
            nextRoutine =
              activeGroup.routines[(lastRoutineIndex + 1) % activeGroup.routines.length];
          }
        }
      }
    }

    if (nextRoutine && nextRoutine.exercises) {
      nextRoutine.exercises = nextRoutine.exercises.filter((e) => e.isActive !== false);
    }

    return { activeGroup, nextRoutine, activeLog };
  }

  /**
   * Get all data needed for the active workout page.
   */
  static async getWorkoutPageData(logId: string) {
    const log = await prisma.workoutLog.findUnique({
      where: { id: logId },
      include: {
        entries: {
          include: { exercise: true },
          orderBy: { order: "asc" }
        }
      }
    });

    if (!log) return { workoutData: null, error: "Workout not found" };
    if (log.finishedAt) return { redirect: "/" };

    const routine = await prisma.routine.findUnique({
      where: { id: log.routineId },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: "asc" }
        }
      }
    });

    if (!routine) return { workoutData: null, error: "Routine not found" };

    // Use logged exercises if session started/modified, else routine defaults
    const exercises =
      log.entries.length > 0
        ? log.entries.map((e) => {
            const routineExercise = routine.exercises.find((re) => re.exerciseId === e.exerciseId);
            return {
              ...e.exercise,
              sessionNote: e.note,
              routineNote: routineExercise?.note,
              targetSets: routineExercise?.targetSets,
              targetReps: routineExercise?.targetReps,
              targetRepsToFailure: routineExercise?.targetRepsToFailure,
              incrementValue: routineExercise?.incrementValue
            };
          })
        : routine.exercises
            .filter((e) => e.isActive !== false)
            .map((e) => ({
              ...e.exercise,
              routineNote: e.note,
              sessionNote: null,
              targetSets: e.targetSets,
              targetReps: e.targetReps,
              targetRepsToFailure: e.targetRepsToFailure,
              incrementValue: e.incrementValue
            }));

    const initialSupersetStatus: Record<string, boolean> = {};
    if (log.entries.length > 0) {
      log.entries.forEach((e) => {
        if (e.isSuperset) initialSupersetStatus[e.exerciseId] = true;
      });
    } else {
      routine.exercises.forEach((e) => {
        if (e.isSuperset) initialSupersetStatus[e.exerciseId] = true;
      });
    }

    const workoutData = {
      logId: log.id,
      initialStartTime: log.createdAt.toISOString(),
      routineName: routine.name,
      routineId: routine.id,
      routineGroupId: routine.routineGroupId,
      exercises,
      initialSupersetStatus,
      routineExercisesList: routine.exercises.map((re) => ({
        exerciseId: re.exerciseId,
        isActive: re.isActive,
        exercise: re.exercise
      })),
      routineExerciseIds: routine.exercises.map((e) => e.exerciseId),
      isDeload: routine.isDeload
    };

    return { workoutData };
  }

  /**
   * Get paginated and grouped history data.
   */
  static async getHistoryPageData(page: number, pageSize: number = 5) {
    const allLogs = await prisma.workoutLog.findMany({
      include: {
        routine: {
          include: { group: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const logs = allLogs.filter((log) => log.finishedAt);

    interface Cycle {
      id: string;
      groupName: string;
      cycleNumber: number;
      logs: any[];
      startDate: Date;
      endDate: Date;
      durationDays: number;
      lastLogDate: Date;
    }

    const cyclesMap = new Map<string, Cycle>();

    logs.forEach((log) => {
      const groupName = log.routine.group.name;
      const cycleNum = log.cycleNumber || 1;
      const key = `${log.routine.group.id}-${cycleNum}`;

      if (!cyclesMap.has(key)) {
        cyclesMap.set(key, {
          id: key,
          groupName,
          cycleNumber: cycleNum,
          logs: [],
          startDate: new Date(log.createdAt),
          endDate: new Date(log.createdAt),
          durationDays: 0,
          lastLogDate: new Date(log.createdAt)
        });
      }

      const cycle = cyclesMap.get(key)!;
      cycle.logs.push(log);

      const logDate = new Date(log.createdAt);
      if (logDate < cycle.startDate) cycle.startDate = logDate;
      if (logDate > cycle.endDate) cycle.endDate = logDate;
      if (logDate > cycle.lastLogDate) cycle.lastLogDate = logDate;
    });

    const cycles = Array.from(cyclesMap.values())
      .map((cycle) => {
        cycle.logs.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const diffTime = Math.abs(cycle.endDate.getTime() - cycle.startDate.getTime());
        cycle.durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        if (cycle.durationDays < 1) cycle.durationDays = 1;
        return cycle;
      })
      .sort((a, b) => b.lastLogDate.getTime() - a.lastLogDate.getTime());

    const totalPages = Math.ceil(cycles.length / pageSize);
    const paginatedCycles = cycles.slice((page - 1) * pageSize, page * pageSize);

    return {
      paginatedCycles,
      totalPages,
      totalCycles: cycles.length
    };
  }

  static async deleteAllLogs() {
    return prisma.$transaction([
      prisma.workoutLogEntry.deleteMany({}),
      prisma.workoutLog.deleteMany({})
    ]);
  }
}
