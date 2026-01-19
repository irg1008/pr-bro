import { PrismaPg } from "@prisma/adapter-pg";
import { parse } from "csv-parse/sync";
import fs from "fs";
import path from "path";
import { loadEnv } from "vite";
import { PrismaClient } from "./generated/client";

const { DATABASE_URL } = loadEnv("", process.cwd(), "");

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
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
    // Load existing exercises to avoid duplicates
    const existingExercises = await prisma.exercise.findMany({
      select: { name: true }
    });
    const existingNames = new Set(existingExercises.map((e) => e.name));

    const fileContent = fs.readFileSync(EXERCISES_CSV_PATH);
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    }) as ExerciseCSVRecord[];

    console.log(`Found ${records.length} exercises in CSV.`);

    const exercisesToCreate = records
      .filter((record) => !existingNames.has(record.name))
      .map((record) => {
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
        const type = category === "CARDIO" ? "CARDIO" : "WEIGHT";

        return {
          name,
          bodyPart,
          equipment,
          target,
          secondaryMuscles,
          instructions,
          imageUrl,
          category,
          type: type as any
        };
      });

    if (exercisesToCreate.length > 0) {
      console.log(`Inserting ${exercisesToCreate.length} new exercises...`);
      await prisma.exercise.createMany({
        data: exercisesToCreate,
        skipDuplicates: true
      });
    } else {
      console.log("No new exercises to insert.");
    }

    let createdCount = exercisesToCreate.length;
    console.log("Exercises inserted.");

    // Seed Generic Cardio Exercises
    const cardioExercises = [
      { name: "Running", equipment: "None" },
      { name: "Walking", equipment: "None" },
      { name: "Cycling", equipment: "Bike" },
      { name: "Swimming", equipment: "Pool" },
      { name: "HIIT", equipment: "None" },
      { name: "Other", equipment: "None" }
    ];

    for (const ex of cardioExercises) {
      const existing = await prisma.exercise.findFirst({
        where: { name: ex.name }
      });

      if (!existing) {
        await prisma.exercise.create({
          data: {
            name: ex.name,
            bodyPart: "Cardio",
            equipment: ex.equipment,
            target: "Cardiovascular System",
            category: "CARDIO",
            type: "CARDIO",
            imageUrl: "", // No specific GIF for generic
            secondaryMuscles: [],
            instructions: [`Perform ${ex.name} for the desired duration or distance.`]
          }
        });
        createdCount++;
      }
    }

    console.log("Seeding Routines...");
    // Seed Routines (Basic PPL)
    // Seed Routines (Basic PPL)
    let pplGroup = await prisma.routineGroup.findFirst({
      where: { name: "Push Pull Legs" }
    });

    if (!pplGroup) {
      pplGroup = await prisma.routineGroup.create({
        data: { name: "Push Pull Legs", isActive: true }
      });
    }

    const routines = [
      {
        name: "Push Day",
        description: "Chest, Shoulders, Triceps",
        exercises: ["Bench Press", "Overhead Press", "Triceps Dip"]
      },
      {
        name: "Pull Day",
        description: "Back, Biceps",
        exercises: ["Pull Up", "Barbell Row", "Bicep Curl"]
      },
      {
        name: "Leg Day",
        description: "Quads, Hams, Calves",
        exercises: ["Squat", "Leg Press", "Calf Raise", "Running"]
      }
    ];

    for (const r of routines) {
      let routine = await prisma.routine.findFirst({
        where: {
          name: r.name,
          routineGroupId: pplGroup.id
        }
      });

      if (!routine) {
        routine = await prisma.routine.create({
          data: {
            name: r.name,
            description: r.description,
            routineGroupId: pplGroup.id
          }
        });
      }

      // Link Exercises
      let order = 0;
      for (const exName of r.exercises) {
        const exercise = await prisma.exercise.findFirst({
          where: { name: { contains: exName, mode: "insensitive" } }
        });

        if (exercise) {
          const existing = await prisma.routineExercise.findFirst({
            where: { routineId: routine.id, exerciseId: exercise.id }
          });
          if (!existing) {
            await prisma.routineExercise.create({
              data: {
                routineId: routine.id,
                exerciseId: exercise.id,
                order: order++
              }
            });
          }
        }
      }
    }

    console.log(`Seeding finished.`);
    console.log(`Created: ${createdCount} exercises.`);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
