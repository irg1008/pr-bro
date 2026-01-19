import { db as prisma } from "@/lib/db";
import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();
  const { routineIds } = data;

  if (!routineIds || !Array.isArray(routineIds)) {
    return new Response("Invalid request", { status: 400 });
  }

  // Update order in transaction
  await prisma.$transaction(
    routineIds.map((id, index) =>
      prisma.routine.update({
        where: { id },
        data: { order: index }
      })
    )
  );

  return new Response("OK", { status: 200 });
};
