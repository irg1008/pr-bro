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
  const { name, description, focusedParts } = await request.json();

  if (!id || !name) {
    return new Response("Missing ID or name", { status: 400 });
  }

  try {
    const routine = await prisma.routine.update({
      where: { id },
      data: {
        name,
        description,
        focusedParts
      }
    });
    return new Response(JSON.stringify(routine), { status: 200 });
  } catch {
    return new Response("Update failed", { status: 500 });
  }
};
