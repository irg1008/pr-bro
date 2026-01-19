import { db as prisma } from "@/lib/db";
import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();

  if (!data.routineId || !data.exerciseId) {
    return new Response("Routine ID and Exercise ID are required", { status: 400 });
  }

  // Get current max order
  const lastItem = await prisma.routineExercise.findFirst({
    where: { routineId: data.routineId },
    orderBy: { order: "desc" }
  });
  const newOrder = (lastItem?.order ?? -1) + 1;

  const routineExercise = await prisma.routineExercise.create({
    data: {
      routineId: data.routineId,
      exerciseId: data.exerciseId,
      order: newOrder
    }
  });

  return new Response(JSON.stringify(routineExercise), {
    status: 201,
    headers: { "Content-Type": "application/json" }
  });
};

export const DELETE: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return new Response("ID is required", { status: 400 });
  }

  await prisma.routineExercise.delete({
    where: { id }
  });

  return new Response(null, { status: 204 });
};

export const PATCH: APIRoute = async ({ request }) => {
  const data = await request.json();
  const { id, isSuperset } = data;

  if (!id) return new Response("ID required", { status: 400 });

  await prisma.routineExercise.update({
    where: { id },
    data: { isSuperset }
  });

  return new Response(null, { status: 200 });
};
