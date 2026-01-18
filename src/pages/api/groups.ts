import { db as prisma } from "@/lib/db";
import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async () => {
  const groups = await prisma.routineGroup.findMany({
    orderBy: { createdAt: "desc" }
  });
  return new Response(JSON.stringify(groups), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};

export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();

  if (!data.name) {
    return new Response("Name is required", { status: 400 });
  }

  const group = await prisma.routineGroup.create({
    data: {
      name: data.name,
      description: data.description,
      isActive: false
    }
  });

  return new Response(JSON.stringify(group), {
    status: 201,
    headers: { "Content-Type": "application/json" }
  });
};
