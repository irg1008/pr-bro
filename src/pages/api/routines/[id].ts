import { db as prisma } from "@/lib/db";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id) return new Response("ID required", { status: 400 });

  const routine = await prisma.routine.findUnique({
    where: { id },
    include: {
      exercises: {
        include: { exercise: true },
        orderBy: { order: "asc" }
      }
    }
  });

  if (!routine) return new Response("Not found", { status: 404 });

  return new Response(JSON.stringify(routine), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
