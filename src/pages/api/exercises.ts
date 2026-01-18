import { db as prisma } from "@/lib/db";
import type { APIRoute } from "astro";
import { MOCK_EXERCISES } from "../../consts/exercises";

export const GET: APIRoute = async () => {
  const count = await prisma.exercise.count();

  if (count === 0) {
    // Auto-seed if empty
    console.log("Seeding mock exercises...");
    await Promise.all(
      MOCK_EXERCISES.map((ex) =>
        prisma.exercise.create({
          data: {
            id: ex.id,
            name: ex.name,
            category: ex.category,
            imageUrl: ex.imageUrl
          }
        })
      )
    );
  }

  const exercises = await prisma.exercise.findMany();
  return new Response(JSON.stringify(exercises), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
