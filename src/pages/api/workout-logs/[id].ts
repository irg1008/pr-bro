import { db as prisma } from "@/lib/db";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) return new Response("ID required", { status: 400 });

  const log = await prisma.workoutLog.findUnique({
    where: { id },
    include: {
      routine: {
        include: { group: true }
      },
      entries: {
        include: { exercise: true },
        orderBy: { order: "asc" }
      }
    }
  });

  if (!log) return new Response("Not found", { status: 404 });

  return new Response(JSON.stringify(log), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};

export const PUT: APIRoute = async ({ request, params }) => {
  const id = params.id;
  if (!id) return new Response("ID required", { status: 400 });

  const data = await request.json();
  const { entries, supersetStatus, finishedAt } = data;

  if (finishedAt) {
    await prisma.workoutLog.update({
      where: { id },
      data: { finishedAt: new Date(finishedAt) }
    });
  }

  if (entries) {
    // Use transaction to ensure atomicity (delete + create)
    await prisma.$transaction(async (tx) => {
      // Sync entries: Delete all existing and recreate
      await tx.workoutLogEntry.deleteMany({
        where: { workoutLogId: id }
      });

      // Entries is Record<exerciseId, sets[]>
      const allExerciseIds = Object.keys(entries);
      // Validate exercises to prevent FK violations
      const validExercises = await prisma.exercise.findMany({
        where: { id: { in: allExerciseIds } },
        select: { id: true }
      });
      const validIdsSet = new Set(validExercises.map((e) => e.id));

      const entryCreates = Object.entries(entries)
        .filter(([exerciseId]) => validIdsSet.has(exerciseId))
        .map(([exerciseId, sets]: [string, any], index) => ({
          workoutLogId: id,
          exerciseId,
          sets: sets,
          isSuperset: supersetStatus?.[exerciseId] || false,
          order: index
        }));

      if (entryCreates.length > 0) {
        await tx.workoutLogEntry.createMany({
          data: entryCreates
        });
      }
    });
  }

  return new Response(null, { status: 200 });
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = params.id;
  if (!id) return new Response("ID required", { status: 400 });

  // Cascade delete logic is handled by Prisma relation if configured,
  // but let's delete entries first manually to be safe or rely on DB.
  // Default Prisma relation usually requires `onDelete: Cascade` in schema.
  // Since I didn't specify it, I better delete manually.

  await prisma.workoutLogEntry.deleteMany({
    where: { workoutLogId: id }
  });

  await prisma.workoutLog.delete({
    where: { id }
  });

  return new Response(null, { status: 204 });
};
