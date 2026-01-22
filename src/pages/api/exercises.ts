import { db as prisma } from "@/lib/db";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const search = url.searchParams.get("search") || "";
  const category = url.searchParams.get("category") || "";
  const prioritize = url.searchParams.get("prioritize") || "";

  const skip = (page - 1) * limit;

  // Base filter
  const baseWhere: any = {};
  if (search) {
    baseWhere.name = { contains: search, mode: "insensitive" };
  }

  if (category) {
    // If specific filter is active, ignore prioritization logic logic for simplicity
    // or just return standard results for that category
    baseWhere.category = category;

    try {
      const [exercises, total] = await Promise.all([
        prisma.exercise.findMany({
          where: baseWhere,
          take: limit,
          skip,
          orderBy: { name: "asc" }
        }),
        prisma.exercise.count({ where: baseWhere })
      ]);
      return jsonResponse(exercises, total, page, limit);
    } catch (e) {
      console.error(e);
      return new Response("Error", { status: 500 });
    }
  }

  // Handle Prioritization
  if (prioritize) {
    const pCategories = prioritize
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const priorityWhere = { ...baseWhere, category: { in: pCategories } };
    const standardWhere = {
      ...baseWhere,
      NOT: { category: { in: pCategories } } // Everything else
    };

    try {
      const pCount = await prisma.exercise.count({ where: priorityWhere });
      const total = await prisma.exercise.count({ where: baseWhere }); // Total of everything matching search

      let exercises: any[] = [];

      if (skip < pCount) {
        // We are still within the priority zone (or overlapping boundary)
        const takeFromP = Math.min(limit, pCount - skip);
        const pExercises = await prisma.exercise.findMany({
          where: priorityWhere,
          take: takeFromP,
          skip: skip,
          orderBy: { name: "asc" }
        });

        exercises = [...pExercises];

        const remainingLimit = limit - pExercises.length;
        if (remainingLimit > 0) {
          // Fill the rest of the page with standard exercises
          const sExercises = await prisma.exercise.findMany({
            where: standardWhere,
            take: remainingLimit,
            skip: 0, // Start from beginning of standard set
            orderBy: { name: "asc" }
          });
          exercises = [...exercises, ...sExercises];
        }
      } else {
        // We are fully past the priority zone
        const adjustedSkip = skip - pCount;
        exercises = await prisma.exercise.findMany({
          where: standardWhere,
          take: limit,
          skip: adjustedSkip,
          orderBy: { name: "asc" }
        });
      }

      return jsonResponse(exercises, total, page, limit);
    } catch (e) {
      console.error("Prioritization Error", e);
      return new Response("Error", { status: 500 });
    }
  }

  // Standard Fetch (No Prioritization, No specific category filter)
  try {
    const [exercises, total] = await Promise.all([
      prisma.exercise.findMany({
        where: baseWhere,
        take: limit,
        skip,
        orderBy: { name: "asc" }
      }),
      prisma.exercise.count({ where: baseWhere })
    ]);

    return jsonResponse(exercises, total, page, limit);
  } catch (e) {
    console.error(e);
    return new Response("Error fetching exercises", { status: 500 });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, category, target, imageUrl, equipment, secondaryMuscles, instructions } = body;

    if (!name) {
      return new Response("Name is required", { status: 400 });
    }

    // Check for existing exercise with same name (case-insensitive)
    const existing = await prisma.exercise.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" }
      }
    });

    if (existing) {
      return new Response("An exercise with this name already exists", { status: 400 });
    }

    const exercise = await prisma.exercise.create({
      data: {
        name,
        category: category || "Other",
        bodyPart: category ? category.toLowerCase() : "other",
        target: target || null,
        equipment: equipment || null,
        imageUrl: imageUrl || null,
        secondaryMuscles: secondaryMuscles || [],
        instructions: instructions || []
      }
    });

    return new Response(JSON.stringify(exercise), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("Error creating exercise:", e);
    return new Response("Error creating exercise", { status: 500 });
  }
};

function jsonResponse(data: any, total: number, page: number, limit: number) {
  return new Response(
    JSON.stringify({
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
}
