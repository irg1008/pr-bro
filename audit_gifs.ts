import { parse } from "csv-parse/sync";
import fs from "fs";
import path from "path";

const csvPath = "d:/Proyectos/pr-bro/public/exercises.csv";
const gifsDir = "d:/Proyectos/pr-bro/public/gifs";
const outputPath = "d:/Proyectos/pr-bro/gif_audit_report.txt";

try {
  // 1. Read CSV IDs
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  });

  // Normalize IDs: ensure 4 digits? The file showed "0001", "1512".
  // Let's assume the ID column is "id".
  const csvIds = new Set(records.map((r: any) => r.id));

  console.log(`Found ${csvIds.size} unique IDs in CSV.`);

  // 2. Read GIF files
  const files = fs.readdirSync(gifsDir);
  const gifFiles = files.filter((f) => f.toLowerCase().endsWith(".gif"));

  // Extract IDs from filenames. Assuming format "0001.gif" or similar.
  const gifMap = new Map(); // id -> filename
  const gifIds = new Set();

  gifFiles.forEach((f) => {
    const id = path.parse(f).name; // "0001" from "0001.gif"
    gifMap.set(id, f);
    gifIds.add(id);
  });

  console.log(`Found ${gifIds.size} GIFs in folder.`);

  // 3. Compare
  const missingGifs = [];
  const unusedGifs = [];

  // Check missing
  for (const id of csvIds) {
    if (!gifIds.has(id)) {
      missingGifs.push(id);
    }
  }

  // Check unused
  for (const id of gifIds) {
    if (!csvIds.has(id)) {
      unusedGifs.push(gifMap.get(id));
    }
  }

  // 4. Output
  let output = `GIF Audit Report\n================\n\n`;

  output += `Total Exercises in CSV: ${csvIds.size}\n`;
  output += `Total GIFs in Folder: ${gifIds.size}\n\n`;

  output += `Missing GIFs (${missingGifs.length}):\n`;
  output += missingGifs.join("\n") + "\n\n";

  output += `Unused GIFs (${unusedGifs.length}):\n`;
  output += unusedGifs.join("\n") + "\n";

  fs.writeFileSync(outputPath, output);
  console.log(`Report written to ${outputPath}`);
} catch (e) {
  console.error("Error details:", e);
}
