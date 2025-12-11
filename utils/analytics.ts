import { WorkoutSet, ExerciseStats, DailySummary } from "../types";
import { 
  format, startOfDay, subDays, eachDayOfInterval, isSameDay, getDay, parse, differenceInMinutes, isValid 
} from "date-fns";

// --- CORE ANALYTICS ---

export const identifyPersonalRecords = (data: WorkoutSet[]): WorkoutSet[] => {
  const sorted = [...data].sort((a, b) => {
    if (a.parsedDate && b.parsedDate) {
      return a.parsedDate.getTime() - b.parsedDate.getTime();
    }
    return 0;
  });

  const maxWeightMap = new Map<string, number>();

  const dataWithPrs = sorted.map(set => {
    const exercise = set.exercise_title;
    const currentWeight = set.weight_kg || 0;
    const previousMax = maxWeightMap.get(exercise) || 0;
    
    let isPr = false;
    if (currentWeight > 0 && currentWeight > previousMax) {
      isPr = true;
      maxWeightMap.set(exercise, currentWeight);
    }

    return { ...set, isPr };
  });

  return dataWithPrs.sort((a, b) => {
    if (a.parsedDate && b.parsedDate) {
      return b.parsedDate.getTime() - a.parsedDate.getTime();
    }
    return 0;
  });
};

export const getDailySummaries = (data: WorkoutSet[]): DailySummary[] => {
  const grouped = data.reduce((acc, curr) => {
    if (!curr.parsedDate) return acc;
    const dateKey = format(curr.parsedDate, "yyyy-MM-dd");
    
    if (!acc[dateKey]) {
      acc[dateKey] = {
        date: dateKey,
        timestamp: startOfDay(curr.parsedDate).getTime(),
        totalVolume: 0,
        workoutTitle: curr.title || 'Workout',
        sets: 0,
        totalReps: 0,
        sessions: new Set<string>(), 
        durationMinutes: 0
      } as any;
    }
    
    const sessionKey = curr.start_time;
    if (!acc[dateKey].sessions.has(sessionKey)) {
        acc[dateKey].sessions.add(sessionKey);
        try {
            const start = curr.parsedDate as Date | undefined;
            const end = parse(curr.end_time, "d MMM yyyy, HH:mm", new Date());
            if (start && isValid(start) && isValid(end)) {
              const duration = differenceInMinutes(end, start);
              if (duration > 0 && duration < 1440) {
                  acc[dateKey].durationMinutes += duration;
              }
            }
        } catch (e) {
            // ignore invalid dates
        }
    }

    const volume = (curr.weight_kg || 0) * (curr.reps || 0);
    acc[dateKey].totalVolume += volume;
    acc[dateKey].sets += 1;
    acc[dateKey].totalReps += (curr.reps || 0);
    
    return acc;
  }, {} as Record<string, any>);

  return Object.values(grouped).map(d => ({
    date: d.date,
    timestamp: d.timestamp,
    totalVolume: d.totalVolume,
    workoutTitle: d.workoutTitle,
    sets: d.sets,
    avgReps: d.sets > 0 ? Math.round(d.totalReps / d.sets) : 0,
    durationMinutes: d.durationMinutes,
    density: d.durationMinutes > 0 ? Math.round(d.totalVolume / d.durationMinutes) : 0
  })).sort((a, b) => a.timestamp - b.timestamp);
};

export const getExerciseStats = (data: WorkoutSet[]): ExerciseStats[] => {
  const grouped = data.reduce((acc, curr) => {
    const name = curr.exercise_title;
    if (!name || !curr.parsedDate) return acc;

    if (!acc[name]) {
      acc[name] = {
        name,
        totalSets: 0,
        totalVolume: 0,
        maxWeight: 0,
        prCount: 0,
        history: [],
      };
    }

    const volume = (curr.weight_kg || 0) * (curr.reps || 0);
    const oneRepMax = curr.reps > 0 ? (curr.weight_kg * (1 + curr.reps / 30)) : 0;

    acc[name].totalSets += 1;
    acc[name].totalVolume += volume;
    if (curr.weight_kg > acc[name].maxWeight) acc[name].maxWeight = curr.weight_kg;
    if (curr.isPr) acc[name].prCount += 1;

    acc[name].history.push({
      date: curr.parsedDate,
      weight: curr.weight_kg,
      reps: curr.reps,
      oneRepMax,
      volume,
      isPr: curr.isPr || false
    });

    return acc;
  }, {} as Record<string, ExerciseStats>);

  return Object.values(grouped).sort((a, b) => b.totalSets - a.totalSets);
};

export const getHeatmapData = (dailyData: DailySummary[]) => {
  if (dailyData.length === 0) return [];
  const lastDate = new Date(dailyData[dailyData.length - 1].timestamp);
  const firstDate = subDays(lastDate, 364);
  const days = eachDayOfInterval({ start: firstDate, end: lastDate });

  return days.map(day => {
    const activity = dailyData.find(d => isSameDay(new Date(d.timestamp), day));
    return {
      date: day,
      count: activity ? activity.sets : 0,
      totalVolume: activity ? activity.totalVolume : 0,
      title: activity ? activity.workoutTitle : null
    };
  });
};

// --- MODERN CHART DATA GENERATORS ---

export const getIntensityEvolution = (data: WorkoutSet[], mode: 'daily' | 'monthly' = 'monthly') => {
  const groupedData: Record<string, any> = {};

  data.forEach(set => {
    if (!set.parsedDate) return;
    
    const key = mode === 'monthly' 
      ? format(set.parsedDate, "yyyy-MM") 
      : format(set.parsedDate, "yyyy-MM-dd");
    
    if (!groupedData[key]) {
      groupedData[key] = {
        dateFormatted: mode === 'monthly' ? format(set.parsedDate, 'MMM yyyy') : format(set.parsedDate, 'MMM d'),
        timestamp: startOfDay(set.parsedDate).getTime(),
        Strength: 0,
        Hypertrophy: 0,
        Endurance: 0
      };
    }

    // Categorize by reps, default to Hypertrophy if reps is 0 or missing
    const reps = set.reps || 8;
    if (reps <= 5) groupedData[key].Strength += 1;
    else if (reps <= 12) groupedData[key].Hypertrophy += 1;
    else groupedData[key].Endurance += 1;
  });

  const result = Object.values(groupedData).sort((a, b) => a.timestamp - b.timestamp);
  return result;
};

export const getDayOfWeekShape = (dailyData: DailySummary[]) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const counts = [0, 0, 0, 0, 0, 0, 0];

  dailyData.forEach(day => {
    const dayIndex = getDay(new Date(day.timestamp));
    counts[dayIndex]++;
  });

  const maxVal = Math.max(...counts);

  return days.map((day, index) => ({
    subject: day,
    A: counts[index],
    fullMark: maxVal
  }));
};

export const getTopExercisesRadial = (stats: ExerciseStats[]) => {
  return stats.sort((a,b) => b.totalSets - a.totalSets).map(s => ({
    name: s.name,
    count: s.totalSets,
  }));
};

export const getTopExercisesOverTime = (data: WorkoutSet[], topExerciseNames: string[], mode: 'daily' | 'monthly' = 'monthly') => {
  // Group data by date and exercise
  const exerciseData: Record<string, Record<string, number>> = {};
  
  // Initialize structure for each top exercise
  topExerciseNames.forEach(name => {
    exerciseData[name] = {};
  });

  // Process each workout set
  data.forEach(set => {
    if (!set.parsedDate || !topExerciseNames.includes(set.exercise_title)) return;
    
    const key = mode === 'monthly' 
      ? format(set.parsedDate, "yyyy-MM") 
      : format(set.parsedDate, "yyyy-MM-dd");

    if (!exerciseData[set.exercise_title][key]) {
      exerciseData[set.exercise_title][key] = 0;
    }
    exerciseData[set.exercise_title][key] += 1; // Count sets
  });

  // Get all unique dates
  const allDates = new Set<string>();
  Object.values(exerciseData).forEach(exData => {
    Object.keys(exData).forEach(date => allDates.add(date));
  });

  // Convert to array format for Recharts
  const sortedDates = Array.from(allDates).sort();
  
  return sortedDates.map(dateKey => {
    const dateObj = mode === 'monthly' 
      ? parse(dateKey, "yyyy-MM", new Date())
      : parse(dateKey, "yyyy-MM-dd", new Date());
    
    const entry: Record<string, any> = {
      date: mode === 'monthly' ? format(dateObj, 'MMM yyyy') : format(dateObj, 'MMM d'),
      dateFormatted: mode === 'monthly' ? format(dateObj, 'MMMM yyyy') : format(dateObj, 'MMM d, yyyy'),
      timestamp: startOfDay(dateObj).getTime(),
    };

    // Add count for each exercise (0 if no data)
    topExerciseNames.forEach(name => {
      entry[name] = exerciseData[name][dateKey] || 0;
    });

    return entry;
  });
};

export const getPrsOverTime = (data: WorkoutSet[], mode: 'daily' | 'monthly' = 'monthly') => {
  const prsData: Record<string, { count: number, timestamp: number, dateFormatted: string }> = {};

  data.forEach(set => {
    if (!set.parsedDate || !set.isPr) return;
    
    const key = mode === 'monthly' 
      ? format(set.parsedDate, "yyyy-MM") 
      : format(set.parsedDate, "yyyy-MM-dd");

    if (!prsData[key]) {
      prsData[key] = {
        count: 0,
        timestamp: startOfDay(set.parsedDate).getTime(),
        dateFormatted: mode === 'monthly' ? format(set.parsedDate, 'MMM yyyy') : format(set.parsedDate, 'MMM d'),
      };
    }
    prsData[key].count += 1;
  });

  return Object.values(prsData).sort((a, b) => a.timestamp - b.timestamp);
};