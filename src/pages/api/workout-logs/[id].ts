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
  const { entries } = data;

  if (!entries) return new Response("Entries required", { status: 400 });

  // Transaction: Delete old entries, create new ones using update
  // Actually, easier to update log entries if IDs are preserved, but for simplicity:
  // We'll update each entry if it exists.

  // Wait, `entries` is our UI model. In DB we have WorkoutLogEntry.
  // Let's assume we are passed the full structure.

  // Strategy: Update the sets JSON for each entry.
  await Promise.all(
    entries.map((entry: any) =>
      prisma.workoutLogEntry.update({
        where: { id: entry.id },
        data: {
          sets: entry.sets
        }
      })
    )
  );

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
