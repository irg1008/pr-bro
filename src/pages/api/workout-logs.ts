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
  const { routineId, duration, entries } = data;

  if (!routineId || !entries) {
    return new Response("Routine ID and entries are required", { status: 400 });
  }

  const log = await prisma.workoutLog.create({
    data: {
      routineId,
      duration,
      entries: {
        create: Object.entries(entries).flatMap(
          ([exerciseId, sets]: [string, any]) =>
            // filter empty sets if needed, or mapped
            ({
              exerciseId,
              sets: sets, // JSON
              order: 0 // Simplification for now
            })
        )
      }
    }
  });

  return new Response(JSON.stringify(log), {
    status: 201,
    headers: { "Content-Type": "application/json" }
  });
};
