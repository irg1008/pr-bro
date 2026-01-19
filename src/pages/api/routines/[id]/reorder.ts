import { db as prisma } from "@/lib/db";
import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ params, request }) => {
  const routineId = params.id;
  if (!routineId) {
    return new Response("Routine ID required", { status: 400 });
  }

  try {
    const body = await request.json();
    const { routineExerciseIds } = body;

    if (!Array.isArray(routineExerciseIds)) {
      return new Response("Invalid body: routineExerciseIds must be an array", { status: 400 });
    }

    // Transaction to update all orders
    await prisma.$transaction(
      routineExerciseIds.map((id, index) =>
        prisma.routineExercise.update({
          where: { id },
          data: { order: index }
        })
      )
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error reordering exercises:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};
