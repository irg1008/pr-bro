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
  console.log("Workout Log Data:", JSON.stringify(data, null, 2));
  const { routineId, finishedAt, entries, createdAt } = data;

  if (!routineId) {
    return new Response("Routine ID is required", { status: 400 });
  }

  const log = await prisma.workoutLog.create({
    data: {
      routineId,
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
