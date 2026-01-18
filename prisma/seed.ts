import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const EXERCISES_CSV_PATH = path.join(process.cwd(), "public", "exercises.csv");

async function main() {
  console.log("Start seeding...");

  try {
    const fileContent = fs.readFileSync(EXERCISES_CSV_PATH);
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });

    console.log(`Found ${records.length} exercises in CSV.`);

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // Fetch all existing exercises to minimize DB calls
    const existingExercises = await prisma.exercise.findMany({
      select: { gifId: true, id: true }
    });
    const existingGifIds = new Set(existingExercises.map((e) => e.gifId).filter(Boolean));

    for (const record of records) {
      const gifId = record.id; // CSV 'id' column corresponds to gif filename base
      const name = record.name;
      const bodyPart = record.bodyPart;
      const equipment = record.equipment;
      const target = record.target;

      // Aggregate instructions and secondary muscles
      const instructions: string[] = [];
      const secondaryMuscles: string[] = [];

      Object.keys(record).forEach((key) => {
        if (key.startsWith("instructions/") && record[key]) {
          instructions.push(record[key]);
        }
        if (key.startsWith("secondaryMuscles/") && record[key]) {
          secondaryMuscles.push(record[key]);
        }
      });

      // Construct image URL (relative to public)
      const imageUrl = `/gifs/${gifId}.gif`;

      // Check if already exists
      if (existingGifIds.has(gifId)) {
        // Optional: Update logic if needed, but for now we skip to fetch faster
        // or we can update with updateMany / specific update if we want to sync CSV changes
        // Let's UPDATE to ensure new fields are populated for existing entries (if any match gifId)

        await prisma.exercise.updateMany({
          where: { gifId },
          data: {
            name,
            bodyPart,
            equipment,
            target,
            secondaryMuscles,
            instructions,
            imageUrl,
            // category? Map bodyPart to category?
            category: bodyPart.toUpperCase()
          }
        });
        updatedCount++;
      } else {
        await prisma.exercise.create({
          data: {
            name,
            bodyPart,
            equipment,
            target,
            secondaryMuscles,
            instructions,
            gifId,
            imageUrl,
            category: bodyPart.toUpperCase()
          }
        });
        createdCount++;
      }
    }

    console.log(`Seeding finished.`);
    console.log(`Created: ${createdCount}`);
    console.log(`Updated: ${updatedCount}`);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
