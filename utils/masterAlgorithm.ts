import { WorkoutSet, SessionAnalysis, AnalysisResult, SetWisdom } from "../types";

/**
 * HELPER: Epley Formula to estimate 1-Rep Max
 * 1RM = Weight * (1 + Reps/30)
 */
const calculateEpley1RM = (weight: number, reps: number): number => {
  if (reps === 0 || weight === 0) return 0;
  return weight * (1 + reps / 30);
};

/**
 * HELPER: Predict Reps for a new weight based on previous 1RM
 * Reps = 30 * ((1RM / NewWeight) - 1)
 */
const predictReps = (old1RM: number, newWeight: number): number => {
  if (newWeight === 0) return 0;
  const predicted = 30 * ((old1RM / newWeight) - 1);
  return Math.max(0, Math.round(predicted * 10) / 10); // Round to 1 decimal
};

/**
 * MASTER ALGORITHM
 * Analyzes strength progression set-by-set.
 */
export const analyzeSetProgression = (sets: WorkoutSet[]): AnalysisResult[] => {
  const analysisLog: AnalysisResult[] = [];
  const DROP_THRESHOLD = 25.0; 

  if (sets.length < 2) return [];

  // LOGIC FIX: Track the highest 1RM demonstrated in the session so far.
  // This prevents "feeder sets" (low reps, not to failure) from ruining the 
  // prediction for the next heavy set.
  let bestSession1RM = 0;

  // Initialize with the first set's performance
  if (sets.length > 0) {
    bestSession1RM = calculateEpley1RM(sets[0].weight_kg, sets[0].reps);
  }

  for (let i = 1; i < sets.length; i++) {
    const prev = sets[i - 1];
    const curr = sets[i];

    const w_prev = prev.weight_kg;
    const r_prev = prev.reps;
    const w_curr = curr.weight_kg;
    const r_curr = curr.reps;

    const vol_prev = w_prev * r_prev;
    const vol_curr = w_curr * r_curr;

    // Check if the previous set established a new peak strength for this session
    const prev_set_1rm = calculateEpley1RM(w_prev, r_prev);
    if (prev_set_1rm > bestSession1RM) {
      bestSession1RM = prev_set_1rm;
    }

    const weight_change_pct = w_prev > 0 
      ? ((w_curr - w_prev) / w_prev) * 100 
      : 0;

    const vol_drop_pct = vol_prev > 0 
      ? ((vol_prev - vol_curr) / vol_prev) * 100 
      : 0;

    let result: AnalysisResult | null = null;
    const transitionLabel = `Set ${i} -> Set ${i + 1}`;

    // --- SCENARIO 1: SAME WEIGHT ---
    if (Math.abs(weight_change_pct) < 1.0) {
      if (vol_drop_pct < -5.0) {
        result = {
          transition: transitionLabel,
          status: 'success',
          metrics: {
            weight_change_pct: '0%',
            vol_drop_pct: `${vol_drop_pct.toFixed(1)}%`,
            actual_reps: r_curr,
            expected_reps: '-',
          },
          shortMessage: 'Second Wind',
          tooltip: `Second Wind: Performance increased by ${Math.abs(vol_drop_pct).toFixed(0)}% on the same weight. You likely held back on the previous set or rested longer than usual.`
        };
      }
      else if (vol_drop_pct >= -5.0 && vol_drop_pct <= DROP_THRESHOLD) {
         result = {
          transition: transitionLabel,
          status: 'info',
          metrics: {
            weight_change_pct: '0%',
            vol_drop_pct: `${vol_drop_pct.toFixed(1)}%`,
            actual_reps: r_curr,
            expected_reps: '-',
          },
          shortMessage: 'Optimal Fatigue',
          tooltip: `Optimal Fatigue: Volume dropped by ${vol_drop_pct.toFixed(0)}%. This range (0-25%) is often optimal for hypertrophy, indicating effort without metabolic collapse.`
        };
      }
      else if (vol_drop_pct > DROP_THRESHOLD) {
        result = {
          transition: transitionLabel,
          status: 'danger',
          metrics: {
            weight_change_pct: '0%',
            vol_drop_pct: `${vol_drop_pct.toFixed(1)}%`,
            actual_reps: r_curr,
            expected_reps: '-',
          },
          shortMessage: 'Significant Drop',
          tooltip: `Significant Drop: Volume dropped by ${vol_drop_pct.toFixed(0)}%. Two likely causes:\n1. The previous set was taken to absolute failure.\n2. Your rest time was too short.\nAdvice: If you rested plenty, leave 1 rep in reserve next time. If you rushed, rest longer.`
        };
      }
    }
    // --- SCENARIO 2: WEIGHT INCREASED ---
    else if (weight_change_pct > 0) {
      // LOGIC FIX: Use bestSession1RM instead of just the previous set's 1RM
      const expected_reps_raw = predictReps(bestSession1RM, w_curr);
      const expected_reps_int = Math.round(expected_reps_raw);
      
      // We allow a small buffer (1.5 reps) because math is perfect but fatigue is real.
      // If prediction is 6.2 reps, hitting 5 is technically a "pass" in a fatigued state.
      const passed = r_curr >= (expected_reps_raw - 1.5);

      if (passed) {
        result = {
          transition: transitionLabel,
          status: 'success',
          metrics: {
            weight_change_pct: `+${weight_change_pct.toFixed(1)}%`,
            vol_drop_pct: `${vol_drop_pct.toFixed(1)}%`,
            actual_reps: r_curr,
            expected_reps: `~${expected_reps_int}`,
          },
          shortMessage: 'Good Overload',
          tooltip: `Good Overload: Weight +${weight_change_pct.toFixed(0)}% and you hit ${r_curr} reps (Expected based on best performance: ~${expected_reps_int}). You are getting stronger.`
        };
      } else {
        result = {
          transition: transitionLabel,
          status: 'warning',
          metrics: {
            weight_change_pct: `+${weight_change_pct.toFixed(1)}%`,
            vol_drop_pct: `${vol_drop_pct.toFixed(1)}%`,
            actual_reps: r_curr,
            expected_reps: `~${expected_reps_int}`,
          },
          shortMessage: 'Premature Jump',
          tooltip: `Premature Jump: Weight +${weight_change_pct.toFixed(0)}% but reps dropped more than expected (Got ${r_curr}, Expected ~${expected_reps_int} based on your best set). Advice: Stay at the lower weight until you can hit more reps.`
        };
      }
    }
    // --- SCENARIO 3: WEIGHT DECREASED ---
    else if (weight_change_pct < 0) {
       result = {
          transition: transitionLabel,
          status: 'info',
          metrics: {
            weight_change_pct: `${weight_change_pct.toFixed(1)}%`,
            vol_drop_pct: `${vol_drop_pct.toFixed(1)}%`,
            actual_reps: r_curr,
            expected_reps: '-',
          },
          shortMessage: 'Backoff Set',
          tooltip: `Backoff: Weight reduced by ${Math.abs(weight_change_pct).toFixed(0)}%. Good for accumulating volume with less neural fatigue.`
        };
    }

    if (result) analysisLog.push(result);
  }

  return analysisLog;
};

export const analyzeSession = (sets: WorkoutSet[]): SessionAnalysis => {
  if (sets.length === 0) {
    return { goalLabel: 'N/A', avgReps: 0, setCount: 0 };
  }

  const totalReps = sets.reduce((acc, s) => acc + (s.reps || 0), 0);
  const avgReps = Math.round(totalReps / sets.length);
  
  let goalLabel = 'Mixed';
  let tooltip = '';

  if (avgReps <= 5) {
    goalLabel = 'Strength';
    tooltip = 'Average reps are low (≤5). This zone prioritizes Neural Adaptation and Max Strength.';
  } else if (avgReps >= 6 && avgReps <= 15) {
    goalLabel = 'Hypertrophy';
    tooltip = 'Average reps are moderate (6-15). This is the "Golden Zone" for Muscle Growth (Hypertrophy).';
  } else if (avgReps > 15) {
    goalLabel = 'Endurance';
    tooltip = 'Average reps are high (>15). This zone prioritizes Metabolic Conditioning and Muscular Endurance.';
  }

  return {
    goalLabel,
    avgReps,
    setCount: sets.length,
    tooltip
  };
};

export const analyzeProgression = (allSetsForExercise: WorkoutSet[], targetReps: number = 10): SetWisdom | null => {
  if (allSetsForExercise.length === 0) return null;

  const minReps = Math.min(...allSetsForExercise.map(s => s.reps));
  
  if (minReps >= targetReps) {
    return { 
      type: 'promote', 
      message: 'Increase Weight',
      tooltip: `You hit ${targetReps}+ reps on ALL sets. To force adaptation (Progressive Overload), increase the weight next session.`
    };
  }
  
  const maxReps = Math.max(...allSetsForExercise.map(s => s.reps));
  if (maxReps < 5) {
     return { 
       type: 'demote', 
       message: 'Decrease Weight', 
       tooltip: `Reps dropped below 5. Unless doing powerlifting, this volume might be too low for muscle growth. Lower weight by 5-10%.`
     };
  }

  return null;
};

// --- COLOR HELPER FOR UI ---
export const getStatusColor = (status: AnalysisResult['status']) => {
  switch (status) {
    case 'success': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50';
    case 'info': return 'bg-blue-500/10 text-blue-400 border-blue-500/50';
    case 'warning': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/50';
    case 'danger': return 'bg-red-500/10 text-red-400 border-red-500/50';
    default: return 'bg-slate-800 text-slate-400 border-slate-700';
  }
};

export const getWisdomColor = (type: string) => {
  switch (type) {
    case 'promote': return 'bg-purple-500/10 text-purple-400 border-purple-500/50';
    case 'demote': return 'bg-orange-500/10 text-orange-400 border-orange-500/50';
    default: return 'bg-slate-800 text-slate-400 border-slate-700';
  }
};