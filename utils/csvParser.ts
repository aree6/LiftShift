import { WorkoutSet } from "../types";
import { parse } from "date-fns";

export const parseWorkoutCSV = (csvContent: string): WorkoutSet[] => {
  const lines = csvContent.split('\n');
  const result: WorkoutSet[] = [];
  
  // Headers are usually the first line, but we know the structure from types
  // "title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Regex to split by comma, ignoring commas inside quotes
    const regex = /(?:^|,)(?:"([^"]*)"|([^",]*))/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(line)) !== null) {
      // Index 1 is quoted, Index 2 is unquoted
      let val = match[1] !== undefined ? match[1] : match[2];
      matches.push(val);
    }
    
    // Safety check for length
    if (matches.length < 10) continue; 

    // Extract basic fields
    const title = matches[0];
    const start_time = matches[1];
    const end_time = matches[2];
    const description = matches[3];
    const exercise_title = matches[4];
    const superset_id = matches[5];
    const exercise_notes = matches[6];
    const set_index = parseInt(matches[7] || "0", 10);
    const set_type = matches[8];
    const weight_kg = parseFloat(matches[9] || "0");
    const reps = parseFloat(matches[10] || "0");
    const distance_km = parseFloat(matches[11] || "0");
    const duration_seconds = parseFloat(matches[12] || "0");
    const rpe = matches[13] ? parseFloat(matches[13]) : null;

    // Parse Date: "9 Dec 2025, 12:42" -> Date object
    let parsedDate: Date | undefined;
    try {
      parsedDate = parse(start_time, "d MMM yyyy, HH:mm", new Date());
    } catch (e) {
      console.warn("Date parse error for", start_time);
    }

    result.push({
      title,
      start_time,
      end_time,
      description,
      exercise_title,
      superset_id,
      exercise_notes,
      set_index,
      set_type,
      weight_kg,
      reps,
      distance_km,
      duration_seconds,
      rpe,
      parsedDate,
    });
  }

  // Sort by date descending initially
  return result.sort((a, b) => {
    if (a.parsedDate && b.parsedDate) {
      return b.parsedDate.getTime() - a.parsedDate.getTime();
    }
    return 0;
  });
};
