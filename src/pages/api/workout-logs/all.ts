import { db as prisma } from "@/lib/db";
import type { APIRoute } from "astro";

export const DELETE: APIRoute = async () => {
  try {
    // Delete all workout logs
    // Due to cascades, this might delete exercises if configured, but typically logs refer to exercises.
    // We only want to delete logs, not exercises or routines.
    await prisma.$transaction([
      prisma.workoutLogEntry.deleteMany({}),
      prisma.workoutLog.deleteMany({})
    ]);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Failed to delete all logs:", error);
    return new Response(JSON.stringify({ error: "Failed to delete logs" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
