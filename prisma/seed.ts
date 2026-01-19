import { PrismaPg } from "@prisma/adapter-pg";
import { parse } from "csv-parse/sync";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import pg from "pg";
import { PrismaClient } from "./generated/client";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const EXERCISES_CSV_PATH = path.join(process.cwd(), "public", "exercises.csv");

interface ExerciseCSVRecord {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  [key: string]: string;
}

async function main() {
  console.log("Start seeding...");

  try {
    // Wipe existing exercises and their relationships
    console.log("Deleting existing exercises and dependencies...");
    // Delete dependent records first to avoid Foreign Key constraints
    await prisma.workoutLogEntry.deleteMany({});
    await prisma.routineExercise.deleteMany({});

    // Now safe to delete exercises
    await prisma.exercise.deleteMany({});
    console.log("Existing exercises and dependencies deleted.");

    const fileContent = fs.readFileSync(EXERCISES_CSV_PATH);
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    }) as ExerciseCSVRecord[];

    console.log(`Found ${records.length} exercises in CSV.`);

    let createdCount = 0;

    for (const record of records) {
      const gifId = record.id;
      const name = record.name;
      const bodyPart = record.bodyPart;
      const equipment = record.equipment;
      const target = record.target;

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

      const imageUrl = `/gifs/${gifId}.gif`;
      const category = bodyPart ? bodyPart.toUpperCase() : "OTHER";

      await prisma.exercise.create({
        data: {
          name,
          bodyPart,
          equipment,
          target,
          secondaryMuscles,
          instructions,
          imageUrl,
          category
        }
      });
      createdCount++;
    }

    console.log(`Seeding finished.`);
    console.log(`Created: ${createdCount}`);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
