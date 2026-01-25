import { db as prisma } from "@/lib/db";
import type { APIRoute } from "astro";

export const prerender = false;

// GET /api/exercises/last-sets?exerciseId=xxx&excludeLogId=yyy
// Returns the most recent finished workout's sets for a given exercise
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const exerciseId = url.searchParams.get("exerciseId");
  const excludeLogId = url.searchParams.get("excludeLogId");

  if (!exerciseId) {
    return new Response(JSON.stringify({ error: "exerciseId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // Find the most recent finished workout log entry for this exercise
    const lastEntry = await prisma.workoutLogEntry.findFirst({
      where: {
        exerciseId,
        workoutLog: {
          finishedAt: { not: null },
          isDeload: false,
          ...(excludeLogId ? { id: { not: excludeLogId } } : {})
        }
      },
      orderBy: {
        workoutLog: {
          finishedAt: "desc"
        }
      },
      include: {
        workoutLog: {
          select: {
            finishedAt: true,
            routine: {
              select: { name: true }
            }
          }
        }
      }
    });

    if (!lastEntry) {
      return new Response(JSON.stringify({ found: false, sets: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(
      JSON.stringify({
        found: true,
        sets: lastEntry.sets,
        note: lastEntry.note,
        finishedAt: lastEntry.workoutLog.finishedAt,
        routineName: lastEntry.workoutLog.routine.name
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (e) {
    console.error("Error fetching last sets:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
