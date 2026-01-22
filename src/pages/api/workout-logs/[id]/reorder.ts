import { db as prisma } from "@/lib/db";
import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request, params }) => {
  const { id } = params;
  if (!id) return new Response("ID required", { status: 400 });

  try {
    const { exerciseIds } = await request.json();

    if (!Array.isArray(exerciseIds)) {
      return new Response("Invalid request body", { status: 400 });
    }

    // Update order in a transaction
    await prisma.$transaction(
      exerciseIds.map((exerciseId, index) =>
        prisma.workoutLogEntry.updateMany({
          where: {
            workoutLogId: id,
            exerciseId: exerciseId
          },
          data: {
            order: index
          }
        })
      )
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Reorder failed:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};
