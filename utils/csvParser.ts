import { WorkoutSet } from "../types";
import { parse, isValid } from "date-fns";
import Papa from "papaparse";

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
      const d = parse(start_time, "d MMM yyyy, HH:mm", new Date());
      parsedDate = isValid(d) ? d : undefined;
    } catch (e) {
      // keep undefined if invalid
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

export const parseWorkoutCSVAsync = (csvContent: string): Promise<WorkoutSet[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      worker: true,
      complete: (results) => {
        try {
          const rows = (results.data as any[]) || [];
          const mapped: WorkoutSet[] = rows.map((row: any) => {
            const title = row.title ?? '';
            const start_time = row.start_time ?? '';
            const end_time = row.end_time ?? '';
            const description = row.description ?? '';
            const exercise_title = row.exercise_title ?? '';
            const superset_id = row.superset_id ?? '';
            const exercise_notes = row.exercise_notes ?? '';
            const set_index = typeof row.set_index === 'number' ? row.set_index : parseInt(row.set_index || '0', 10);
            const set_type = row.set_type ?? '';
            const weight_kg = typeof row.weight_kg === 'number' ? row.weight_kg : parseFloat(row.weight_kg || '0');
            const reps = typeof row.reps === 'number' ? row.reps : parseFloat(row.reps || '0');
            const distance_km = typeof row.distance_km === 'number' ? row.distance_km : parseFloat(row.distance_km || '0');
            const duration_seconds = typeof row.duration_seconds === 'number' ? row.duration_seconds : parseFloat(row.duration_seconds || '0');
            const rpe = row.rpe !== undefined && row.rpe !== null && row.rpe !== ''
              ? (typeof row.rpe === 'number' ? row.rpe : parseFloat(row.rpe))
              : null;
            let parsedDate: Date | undefined;
            try {
              const d = parse(start_time, "d MMM yyyy, HH:mm", new Date());
              parsedDate = isValid(d) ? d : undefined;
            } catch {}
            return {
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
            } as WorkoutSet;
          });
          const sorted = mapped.sort((a, b) => {
            if (a.parsedDate && b.parsedDate) {
              return b.parsedDate.getTime() - a.parsedDate.getTime();
            }
            return 0;
          });
          resolve(sorted);
        } catch (err) {
          reject(err);
        }
      },
      error: (error) => reject(error),
    });
  });
};
