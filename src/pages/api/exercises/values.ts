import { db } from "@/lib/db";
import type { APIRoute } from "astro";
import type { ExerciseScalarFieldEnum } from "prisma/generated/internal/prismaNamespace";

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const field = url.searchParams.get("field");

  if (!field || !["category", "bodyPart", "target"].includes(field)) {
    return new Response("Invalid field parameter", { status: 400 });
  }

  try {
    // We use raw query or findMany with distinct.
    // Since distinct is strictly typed to known fields, we can cast or switch.
    // However, Prisma 'distinct' + 'select' is efficient.

    // Using any for the field selection to satisfy TS for dynamic field name
    // effectively: distinct: [field], select: { [field]: true }

    const values = await db.exercise.findMany({
      distinct: [field as ExerciseScalarFieldEnum],
      select: {
        [field]: true
      },
      where: {
        [field]: {
          not: null
        }
      },
      orderBy: {
        [field]: "asc"
      }
    });

    // Extract the strings
    const distinctValues = values
      .map((item: any) => item[field])
      .filter((v: string | null) => v && v.trim() !== "");

    return new Response(JSON.stringify(distinctValues), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error(`Failed to fetch values for ${field}`, error);
    return new Response(JSON.stringify({ error: "Failed to fetch values" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
