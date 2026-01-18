import { db as prisma } from "@/lib/db";
import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();

  if (!data.name || !data.routineGroupId) {
    return new Response("Name and Group ID are required", { status: 400 });
  }

  const routine = await prisma.routine.create({
    data: {
      name: data.name,
      description: data.description,
      routineGroupId: data.routineGroupId
    }
  });

  return new Response(JSON.stringify(routine), {
    status: 201,
    headers: { "Content-Type": "application/json" }
  });
};
