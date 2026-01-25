import { db as prisma } from "@/lib/db";
import type { WorkoutSet } from "@/lib/progressive-overload";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return new Response("Log ID is required", { status: 400 });
  }

  try {
    // 1. Get the current log to find the routineId
    const currentLog = await prisma.workoutLog.findUnique({
      where: { id },
      select: { routineId: true }
    });

    if (!currentLog || !currentLog.routineId) {
      return new Response("Routine not found for this log", { status: 404 });
    }

    // 2. Find the most recent finished log for this routine, excluding current
    const lastLog = await prisma.workoutLog.findFirst({
      where: {
        routineId: currentLog.routineId,
        id: { not: id },
        finishedAt: { not: null },
        isDeload: false
      },
      orderBy: {
        finishedAt: "desc"
      },
      include: {
        entries: {
          orderBy: { order: "asc" }
        }
      }
    });

    if (!lastLog) {
      return new Response(JSON.stringify({ found: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 3. Format data for ActiveWorkout consumption
    // We need sets map, note map, superset map
    const sets: Record<string, any[]> = {};
    const notes: Record<string, string> = {};
    const supersets: Record<string, boolean> = {};

    lastLog.entries.forEach((entry) => {
      sets[entry.exerciseId] = entry.sets as unknown as WorkoutSet[];
      if (entry.note) notes[entry.exerciseId] = entry.note;
      if (entry.isSuperset) supersets[entry.exerciseId] = true;
    });

    return new Response(
      JSON.stringify({
        found: true,
        data: {
          sets,
          sessionNotes: notes,
          supersetStatus: supersets,
          finishedAt: lastLog.finishedAt
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Failed to fetch last routine run:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
};
