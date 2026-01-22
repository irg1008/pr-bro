import { db as prisma } from "@/lib/db";
import type { APIRoute } from "astro";

export const PUT: APIRoute = async ({ params, request }) => {
  const { id } = params;
  if (!id) return new Response("Exercise ID is required", { status: 400 });

  try {
    const body = await request.json();
    const { name, category, target, imageUrl, description, equipment } = body;

    // Check for existing exercise with same name (exclude current id)
    if (name) {
      const existing = await prisma.exercise.findFirst({
        where: {
          name: { equals: name, mode: "insensitive" },
          id: { not: id }
        }
      });

      if (existing) {
        return new Response("An exercise with this name already exists", { status: 400 });
      }
    }

    const exercise = await prisma.exercise.update({
      where: { id },
      data: {
        name,
        category,
        bodyPart: category ? category.toLowerCase() : undefined, // Auto-fill bodyPart from category
        target,
        imageUrl,
        description,
        equipment,
        secondaryMuscles: body.secondaryMuscles,
        instructions: body.instructions
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
    await prisma.$transaction([
      prisma.routineExercise.deleteMany({ where: { exerciseId: id } }),
      prisma.workoutLogEntry.deleteMany({ where: { exerciseId: id } }),
      prisma.exercise.delete({ where: { id } })
    ]);

    return new Response(null, { status: 204 });
  } catch (e) {
    console.error("Error deleting exercise:", e);
    return new Response("Error deleting exercise", { status: 500 });
  }
};
