import { db as prisma } from "@/lib/db";
import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
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
  let activeLog = null;

  // Check for ANY active workout log first
  activeLog = await prisma.workoutLog.findFirst({
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

  if (activeLog) {
    // If active log exists, use its routine for context
    const matchingRoutine = activeGroup?.routines.find((r) => r.id === activeLog?.routineId);
    if (matchingRoutine) {
      nextRoutine = matchingRoutine;
    }
  } else if (activeGroup && activeGroup.routines.length > 0) {
    // No active log, calculate next routine
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
        const lastRoutineIndex = activeGroup.routines.findIndex((r) => r.id === lastLog.routineId);
        if (lastRoutineIndex === -1) {
          nextRoutine = activeGroup.routines[0];
        } else {
          nextRoutine = activeGroup.routines[(lastRoutineIndex + 1) % activeGroup.routines.length];
        }
      }
    }
  }

  // Filter inactive exercises from the preview
  if (nextRoutine && nextRoutine.exercises) {
    nextRoutine.exercises = nextRoutine.exercises.filter((e) => e.isActive !== false);
  }

  return new Response(JSON.stringify({ activeGroup, nextRoutine, activeLog }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
