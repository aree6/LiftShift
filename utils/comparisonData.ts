// Comparison data mapping SVG filenames to weight, label, and playful descriptions
// Used in FlexView to compare user's total volume lifted to real-world objects

export interface ComparisonItem {
  weight: number; // in kg
  label: string;
  description: string;
}

export interface ComparisonData {
  instruction: {
    selectionRule: string;
  };
  allFiles: string[];
  items: Record<string, ComparisonItem>;
}

export const COMPARISON_DATA: ComparisonData = {
  instruction: {
    selectionRule: "On every page reload, randomly pick one file; if the user's lifted weight is 0, show a special zero-lift message and don't compare; otherwise select the closest mapped item by weight (or use the random pick if you prefer), then display its label and description."
  },
  allFiles: [
    "Automatic__aussault_gun.svg",
    "Chicken_whole_skinned.svg",
    "Decorated-Elephant.svg",
    "Donald-Trump.svg",
    "Egyptian-pyramids.svg",
    "Egyptian-sphinx.svg",
    "F15jet.svg",
    "Female-Bodybuilder-flexing-sillhuite.svg",
    "Ford-Falcon.svg",
    "Gorilla.svg",
    "Muscular-Putin.svg",
    "Statue-Of-Liberty.svg",
    "Taj-Mahal-Illustration.svg",
    "Titanic.svg",
    "U.S.-American-Bomb.svg",
    "electric_train.svg",
    "fighter-Jet.svg",
    "hercules-statue.svg",
    "horse.svg",
    "loaded-artillery-truck.svg",
    "male -Posing-Bodybuilder.svg",
    "male-Bodybuilder-flexing-sillhuite.svg",
    "mustang.svg",
    "napolean-on-horse-with-his-army-on-feet-climbing-mountain..svg",
    "oil-tanker.svg",
    "passenger_Plane.svg",
    "refrigerator.svg",
    "sad-alexander-the-great.svg",
    "three-nerd-personas-scalar.svg",
    "war-Tank.svg",
    "whole_chicken_Egg.svg",
    "yellow-banana.svg",
    "yeti.svg"
  ],
  items: {
    "Automatic__aussault_gun.svg": {
      weight: 3.6,
      label: "Assault Rifles",
      description: "Make sure to not Assault your rotater cuff."
    },
    "Chicken_whole_skinned.svg": {
      weight: 1.8,
      label: "Chickens",
      description: "Meal prep meets overload—don’t drop your protein."
    },
    "Decorated-Elephant.svg": {
      weight: 5400.0,
      label: "Elephants",
      description: "Gravity negotiator: one rep, instant legend status."
    },
    "Donald-Trump.svg": {
      weight: 102.0,
      label: "Loud Guys in Suits",
      description: "Tremendous lift. Really tremendous. Believe me.\nGreat guy, great compression tee , very strong, the best fit."
    },
    "Egyptian-pyramids.svg": {
      weight: 6000000.0,
      label: "Pyramids",
      description: "Civilization-level overload—ancient engineers approve."
    },
    "Egyptian-sphinx.svg": {
      weight: 2000000.0,
      label: "Sphinxes",
      description: "One rep unlocks Pharaoh mode, chalk becomes an offering."
    },
    "F15jet.svg": {
      weight: 12700.0,
      label: "F-15 Fighter Jets",
      description: "Not a lift, a launch—air superiority achieved."
    },
    "Female-Bodybuilder-flexing-sillhuite.svg": {
      weight: 72.0,
      label: "Pro Bodybuilders",
      description: "You lifted the aura and still got mogged."
    },
    "Ford-Falcon.svg": {
      weight: 1450.0,
      label: "Ford Falcons",
      description: "Don't forget to re-rack it in the driveway."
    },
    "Gorilla.svg": {
      weight: 160.0,
      label: "Gorillas",
      description: "Silverback strength borrowed—avoid eye contact mid-rep."
    },
    "Muscular-Putin.svg": {
      weight: 98.0,
      label: "Bodybuilder Putins",
      description: "Heavy stare, heavier weight—soundtrack required."
    },
    "Statue-Of-Liberty.svg": {
      weight: 204000.0,
      label: "Statues of Liberty",
      description: "Torch up, core tight—liberty for your stabilizers."
    },
    "Taj-Mahal-Illustration.svg": {
      weight: 200000.0,
      label: "Taj Mahals",
      description: "Romance is heavy; your spine files a complaint."
    },
    "Titanic.svg": {
      weight: 52300000.0,
      label: "Titanics",
      description: "Unsinkable ego, unliftable mass—iceberg not included."
    },
    "U.S.-American-Bomb.svg": {
      weight: 4500.0,
      label: "N Bombs",
      description: "Handle carefully—your PR has geopolitical consequences."
    },
    "electric_train.svg": {
      weight: 150000.0,
      label: "Electric Train Cars",
      description: "All aboard the gains express—mind the consciousness gap."
    },
    "fighter-Jet.svg": {
      weight: 9500.0,
      label: "Fighter Jets",
      description: "Sonic boom lockout—jet fuel vibes only."
    },
    "hercules-statue.svg": {
      weight: 1200.0,
      label: "Hercules Statues",
      description: "Mythic strength in stone—gods clap, physio cries."
    },
    "horse.svg": {
      weight: 500.0,
      label: "Horses",
      description: "It moves mid-rep; you learn why barbells exist."
    },
    "loaded-artillery-truck.svg": {
      weight: 18000.0,
      label: "Artillery Trucks",
      description: "You loaded logistics, not plates—commander status unlocked."
    },
    "male -Posing-Bodybuilder.svg": {
      weight: 88.0,
      label: "Posing Bodybuilders",
      description: "You lifted the pose; they still out-flexed you."
    },
    "male-Bodybuilder-flexing-sillhuite.svg": {
      weight: 85.0,
      label: "Bodybuilders",
      description: "Even the silhouette outlifts you—psychological damage."
    },
    "mustang.svg": {
      weight: 1650.0,
      label: "Mustangs",
      description: "V8 energy, zero spinal safety—parking lot champion."
    },
    "napolean-on-horse-with-his-army-on-feet-climbing-mountain..svg": {
      weight: 105000.0,
      label: "Napoleon's Armies",
      description: "You’re carrying history uphill—every rep is a campaign."
    },
    "oil-tanker.svg": {
      weight: 300000000.0,
      label: "Oil Tanker Ships",
      description: "Congrats, you’re now maritime infrastructure."
    },
    "passenger_Plane.svg": {
      weight: 80000.0,
      label: "Passenger Planes",
      description: "Seatbelt sign on—keep limbs inside the PR."
    },
    "refrigerator.svg": {
      weight: 85.0,
      label: "Refrigerators",
      description: "A literal heavy cut—meal prep storage weaponized."
    },
    "sad-alexander-the-great.svg": {
      weight: 90.0,
      label: "Sad Alexander the Great",
      description: "You conquered one rep; history demands better bracing."
    },
    "three-nerd-personas-scalar.svg": {
      weight: 210.0,
      label: "Science Based Lifters (Stacked)",
      description: "They debate your RPE—show them your dashboard."
    },
    "war-Tank.svg": {
      weight: 62000.0,
      label: "Battle Tanks",
      description: "Military parade warm-up—the ground starts negotiating."
    },
    "whole_chicken_Egg.svg": {
      weight: 0.1,
      label: "Eggs",
      description: "Tiny plate, fragile PR—scramble later."
    },
    "yellow-banana.svg": {
      weight: 0.2,
      label: "Bananas",
      description: "Potassium overload—small weight, big morale."
    },
    "yeti.svg": {
      weight: 180.0,
      label: "Yetis",
      description: "Cryptid load—DOMS becomes legend."
    }
  }
};

// Helper function to find the closest comparison item by weight
export function findClosestComparison(volumeKg: number): { filename: string; item: ComparisonItem; count: number } | null {
  if (volumeKg <= 0) return null;
  
  const entries = Object.entries(COMPARISON_DATA.items);
  if (entries.length === 0) return null;
  
  let closestFilename = entries[0][0];
  let closestItem = entries[0][1];
  let closestDiff = Math.abs(volumeKg - closestItem.weight);
  
  for (const [filename, item] of entries) {
    const diff = Math.abs(volumeKg - item.weight);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestFilename = filename;
      closestItem = item;
    }
  }
  
  // Calculate how many of this item the volume equals
  const count = Math.round((volumeKg / closestItem.weight) * 10) / 10;
  
  return { filename: closestFilename, item: closestItem, count };
}

// Helper to find the best comparison (where volume is close to a nice multiple)
export function findBestComparison(volumeKg: number): { filename: string; item: ComparisonItem; count: number } | null {
  if (volumeKg <= 0) return null;
  
  const entries = Object.entries(COMPARISON_DATA.items);
  if (entries.length === 0) return null;
  
  let bestFilename = '';
  let bestItem: ComparisonItem | null = null;
  let bestCount = 0;
  let bestScore = Infinity;
  
  for (const [filename, item] of entries) {
    const count = volumeKg / item.weight;
    // We want count to be a nice number (close to an integer or .5)
    const roundedCount = Math.round(count * 2) / 2; // Round to nearest 0.5
    if (roundedCount < 0.5) continue; // Skip if less than half
    
    const diff = Math.abs(count - roundedCount);
    // Prefer counts that are whole numbers or nice fractions
    const score = diff + (roundedCount > 1000 ? 0.5 : 0); // Slight penalty for huge counts
    
    if (score < bestScore) {
      bestScore = score;
      bestFilename = filename;
      bestItem = item;
      bestCount = roundedCount;
    }
  }
  
  if (!bestItem) {
    // Fallback to closest
    return findClosestComparison(volumeKg);
  }
  
  return { filename: bestFilename, item: bestItem, count: bestCount };
}

// Get a random comparison item
export function getRandomComparison(): { filename: string; item: ComparisonItem } {
  const files = COMPARISON_DATA.allFiles;
  const randomFile = files[Math.floor(Math.random() * files.length)];
  return { filename: randomFile, item: COMPARISON_DATA.items[randomFile] };
}

// Format large numbers with appropriate suffixes
export function formatLargeNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toFixed(1).replace(/\.0$/, '');
}
