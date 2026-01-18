import { db as prisma } from "@/lib/db";
import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();
  const { groupId } = data;

  if (!groupId) {
    return new Response("Group ID is required", { status: 400 });
  }

  // Deactivate all
  await prisma.routineGroup.updateMany({
    data: { isActive: false }
  });

  // Activate target
  await prisma.routineGroup.update({
    where: { id: groupId },
    data: { isActive: true }
  });

  return new Response(null, { status: 200 });
};
