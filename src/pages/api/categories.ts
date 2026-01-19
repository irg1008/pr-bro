import { db } from "@/lib/db";
import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  try {
    const categories = await db.exercise.findMany({
      distinct: ["category"],
      select: {
        category: true
      },
      where: {
        category: {
          not: ""
        }
      },
      orderBy: {
        category: "asc"
      }
    });

    const categoryList = categories.map((c) => c.category).filter(Boolean);

    // Schema usually handles connection management, or it's a long-lived connection in dev

    return new Response(JSON.stringify(categoryList), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Failed to fetch categories", error);
    return new Response(JSON.stringify({ error: "Failed to fetch categories" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
};
