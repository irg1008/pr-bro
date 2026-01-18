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
        orderBy: { createdAt: "asc" }
      }
    }
  });

  let nextRoutine = null;

  if (activeGroup && activeGroup.routines.length > 0) {
    // Find last log
    const lastLog = await prisma.workoutLog.findFirst({
      where: { routine: { routineGroupId: activeGroup.id } },
      orderBy: { createdAt: "desc" }
    });

    if (!lastLog) {
      nextRoutine = activeGroup.routines[0];
    } else {
      const lastRoutineIndex = activeGroup.routines.findIndex((r) => r.id === lastLog.routineId);
      if (lastRoutineIndex === -1) {
        nextRoutine = activeGroup.routines[0];
      } else {
        nextRoutine = activeGroup.routines[(lastRoutineIndex + 1) % activeGroup.routines.length];
      }
    }
  }

  return new Response(JSON.stringify({ activeGroup, nextRoutine }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
