import { db as prisma } from "@/lib/db";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return new Response("ID required", { status: 400 });
  }

  const group = await prisma.routineGroup.findUnique({
    where: { id },
    include: {
      routines: {
        include: {
          exercises: true
        }
      }
    }
  });

  if (!group) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(JSON.stringify(group), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
