export const getMuscleGroup = (title: string): string => {
  const t = title.toLowerCase();
  
  if (t.includes('bench') || t.includes('chest') || t.includes('pec') || t.includes('fly') || t.includes('push-up') || t.includes('pushup')) return 'Chest';
  if (t.includes('lat') || t.includes('row') || t.includes('pull-up') || t.includes('pullup') || t.includes('chin-up') || t.includes('back extension') || t.includes('face pull')) return 'Back';
  if (t.includes('squat') || t.includes('leg') || t.includes('calf') || t.includes('lunge') || t.includes('deadlift') || t.includes('glute')) return 'Legs';
  if (t.includes('shoulder') || t.includes('overhead') || t.includes('military') || t.includes('lateral raise') || t.includes('upright row') || t.includes('deltoid')) return 'Shoulders';
  if (t.includes('curl') || t.includes('tricep') || t.includes('dip') || t.includes('skull') || t.includes('hammer') || t.includes('bicep') || t.includes('arm')) return 'Arms';
  if (t.includes('crunch') || t.includes('plank') || t.includes('sit-up') || t.includes('core') || t.includes('ab')) return 'Core';
  
  return 'Other';
};

export const MUSCLE_COLORS: Record<string, string> = {
  'Chest': '#ef4444', // Red-500
  'Back': '#3b82f6', // Blue-500
  'Legs': '#10b981', // Emerald-500
  'Shoulders': '#f59e0b', // Amber-500
  'Arms': '#8b5cf6', // Violet-500
  'Core': '#ec4899', // Pink-500
  'Other': '#64748b', // Slate-500
};

export const MUSCLE_FILL_COLORS: Record<string, string> = {
  'Chest': '#7f1d1d', 
  'Back': '#1e3a8a', 
  'Legs': '#064e3b', 
  'Shoulders': '#78350f', 
  'Arms': '#4c1d95', 
  'Core': '#831843', 
  'Other': '#334155', 
};