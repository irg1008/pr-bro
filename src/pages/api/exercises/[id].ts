import { db as prisma } from "@/lib/db";
import type { APIRoute } from "astro";

export const PUT: APIRoute = async ({ params, request }) => {
  const { id } = params;
  if (!id) return new Response("Exercise ID is required", { status: 400 });

  try {
    const body = await request.json();
    const { name, category, bodyPart, target, imageUrl, description, equipment } = body;

    const exercise = await prisma.exercise.update({
      where: { id },
      data: {
        name,
        category,
        bodyPart,
        target,
        imageUrl,
        description,
        equipment
      }
    });

    return new Response(JSON.stringify(exercise), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("Error updating exercise:", e);
    return new Response("Error updating exercise", { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) return new Response("Exercise ID is required", { status: 400 });

  try {
    await prisma.exercise.delete({
      where: { id }
    });

    return new Response(null, { status: 204 });
  } catch (e) {
    console.error("Error deleting exercise:", e);
    return new Response("Error deleting exercise", { status: 500 });
  }
};
