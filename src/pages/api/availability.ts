import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async () => {
  // const bookedDates = await db.booking.findMany({
  //   select: { startDate: true, endDate: true },
  //   // endDate > today (string comparison works for YYYY-MM-DD format)
  //   where: { endDate: { gt: todayStr } },
  //   orderBy: { startDate: "asc" }
  // });

  return new Response(JSON.stringify({ unavailableDates: [] }), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    }
  });
};
