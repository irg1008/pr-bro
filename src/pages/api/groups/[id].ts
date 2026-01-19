import { db as prisma } from "@/lib/db";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return new Response("ID required", { status: 400 });
  }

  const group = await prisma.routineGroup.findUnique({
    where: { id },
    include: {
      routines: {
        include: {
          exercises: true
        }
      }
    }
  });

  if (!group) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(JSON.stringify(group), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};

export const PATCH: APIRoute = async ({ params, request }) => {
  const { id } = params;
  if (!id) return new Response("ID required", { status: 400 });

  try {
    const body = await request.json();
    const { name, description } = body;

    const updated = await prisma.routineGroup.update({
      where: { id },
      data: { name, description }
    });

    return new Response(JSON.stringify(updated), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response("Failed to update group", { status: 500 });
  }
};
export const DELETE: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) return new Response("ID required", { status: 400 });

  try {
    // Delete associated data first (manual cascade)
    const routines = await prisma.routine.findMany({ where: { routineGroupId: id } });

    for (const routine of routines) {
      await prisma.workoutLogEntry.deleteMany({ where: { workoutLog: { routineId: routine.id } } });
      await prisma.workoutLog.deleteMany({ where: { routineId: routine.id } });
      await prisma.routineExercise.deleteMany({ where: { routineId: routine.id } });
    }

    await prisma.routine.deleteMany({ where: { routineGroupId: id } });
    await prisma.routineGroup.delete({ where: { id } });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return new Response("Failed to delete", { status: 500 });
  }
};
