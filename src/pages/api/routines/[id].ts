import { db as prisma } from "@/lib/db";
import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) return new Response("Missing ID", { status: 400 });

  const routine = await prisma.routine.findUnique({
    where: { id },
    include: {
      exercises: {
        include: {
          exercise: true
        },
        orderBy: {
          order: "asc"
        }
      }
    }
  });

  if (!routine) return new Response("Not found", { status: 404 });

  return new Response(JSON.stringify(routine), { status: 200 });
};

export const DELETE: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) return new Response("Missing ID", { status: 400 });

  try {
    await prisma.routine.delete({
      where: { id }
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Delete failed", error);
    return new Response("Delete failed", { status: 500 });
  }
};

export const PATCH: APIRoute = async ({ params, request }) => {
  const { id } = params;
  const body = await request.json();
  const { name, description, focusedParts, exercises, isDeload } = body; // exercises: { id: string, isActive: boolean, order?: number }[]

  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  try {
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (focusedParts !== undefined) updateData.focusedParts = focusedParts;
    if (isDeload !== undefined) updateData.isDeload = isDeload;

    // 1. Update basic details
    if (Object.keys(updateData).length > 0) {
      await prisma.routine.update({
        where: { id },
        data: updateData
      });
    }

    // 2. Update nested exercises (e.g. isActive, order) if provided
    if (exercises && Array.isArray(exercises)) {
      // We process them one by one or via transaction
      await prisma.$transaction(
        exercises.map((ex: any) =>
          prisma.routineExercise.update({
            where: { id: ex.id },
            data: {
              isActive: ex.isActive,
              order: ex.order
            }
          })
        )
      );
    }

    // Fetch fresh
    const updatedRoutine = await prisma.routine.findUnique({
      where: { id },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: "asc" }
        }
      }
    });

    return new Response(JSON.stringify(updatedRoutine), { status: 200 });
  } catch (e) {
    console.error("Update failed", e);
    return new Response("Update failed", { status: 500 });
  }
};
