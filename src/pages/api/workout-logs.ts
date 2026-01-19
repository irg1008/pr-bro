import { db as prisma } from "@/lib/db";
import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async () => {
  const logs = await prisma.workoutLog.findMany({
    include: {
      routine: {
        include: {
          group: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return new Response(JSON.stringify(logs), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};

export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();
  const { routineId, finishedAt, entries, createdAt } = data;

  if (!routineId) {
    return new Response("Routine ID is required", { status: 400 });
  }

  // Calculate Cycle Number
  let cycleNumber = 1;
  const currentRoutine = await prisma.routine.findUnique({
    where: { id: routineId },
    include: { group: true }
  });

  if (currentRoutine) {
    // 1. Get the most recent log for this group to find current cycle number
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

      // 2. Check if this specific routine has already been done in the current cycle
      const existingRoutineInCycle = await prisma.workoutLog.findFirst({
        where: {
          routineId: routineId,
          cycleNumber: currentCycleNum
        }
      });

      if (existingRoutineInCycle) {
        // Routine repeated -> New Cycle
        cycleNumber = currentCycleNum + 1;
      } else {
        // Routine new in this cycle -> Same Cycle
        cycleNumber = currentCycleNum;
      }
    }
  }

  const log = await prisma.workoutLog.create({
    data: {
      routineId,
      cycleNumber,
      finishedAt: finishedAt ? new Date(finishedAt) : undefined,
      createdAt: createdAt ? new Date(createdAt) : undefined,
      entries: entries
        ? {
            create: Object.entries(entries).flatMap(([exerciseId, sets]: [string, any]) => ({
              exerciseId,
              sets: sets,
              order: 0
            }))
          }
        : undefined
    }
  });

  return new Response(JSON.stringify(log), {
    status: 201,
    headers: { "Content-Type": "application/json" }
  });
};
