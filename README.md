<div align="center">
  <img src="frontend/public/UI/logo.svg" alt="LiftShift Logo" width="200" height="200" />
  
  # LiftShift

  Free and open source workout analytics.

  [**Website**](https://liftshift.app) · [**How it works**](https://liftshift.app/how-it-works) · [**Features**](https://liftshift.app/features) · [**License**](LICENSE)
</div>

---

LiftShift takes your workout logs from Hevy, Strong, or Lyfta and shows you what they actually mean. Which muscles are you neglecting? Is your bench press actually getting stronger, or just wobbling around the same weight? What should you try next session? Your logging app won't answer those questions. LiftShift does.

Everything runs locally in your browser. No account needed. Sync your data through the app's API or upload a CSV, and the analysis happens on your device.

---

## Screenshots

<div align="center">
  <img src="./frontend/public/images/misc/1.avif" alt="UI Screenshot 1" />
</div>

<div align="center">
  <img src="./frontend/public/images/misc/2.avif" alt="UI Screenshot 2" />
</div>

<div align="center">
  <img src="./frontend/public/images/misc/3.avif" alt="UI Screenshot 3" />
</div>

<div align="center">
  <img src="./frontend/public/images/misc/4.avif" alt="UI Screenshot 4" />
</div>

<div align="center">
  <img src="./frontend/public/images/misc/5.avif" alt="UI Screenshot 5" />
</div>

<div align="center">
  <img src="./frontend/public/images/misc/6.avif" alt="UI Screenshot 6" />
</div>

---

## Features

**Muscle heatmaps:** an interactive body map that shows which muscles you train and how much. Click any muscle to see the exact exercises that built it. Tracks weekly volume, volume zones (MEV/MRV thresholds that scale with your training age), and a 0-100 hypertrophy score per muscle. Supports male and female silhouettes.

**PR tracking:** seven types of personal records — weight, 1RM, set volume, session volume, reps, weighted reps, and distance — in gold (all-time best) and silver (1-month best) tiers. Plus premature PR detection (big jumps you couldn't sustain), PR droughts, and your PR hit rate per week.

**Plateau detection:** every exercise gets a status, like Getting stronger, Plateauing, or Taking a dip, with a confidence level based on how many sessions you've logged. When you stall, LiftShift tells you what to try: add a rep, bump the weight, deload, or switch up the rep scheme. Distinguishes between static plateaus (weight and reps both frozen) and general plateaus (flat trend but still varying).

**Set-by-set feedback:** open any past workout and LiftShift analyzes each set across 19 scenarios. Things like normal fatigue, weight jumps that were too aggressive, smart back-off sets, and AMRAP pushes. Each set gets a badge and a plain-English suggestion for next session. It also tells you whether to stay at your current top weight, increase it, or reduce it.

**Calendar filtering:** pick any date range, from a single day to the full year, and every chart, metric, and calculation updates to just that window. Compare training blocks without exporting and reimporting.

**Multi-app merge:** switched from Strong to Hevy? Use both? LiftShift normalizes exercise names across sources and merges everything into one dataset. Duplicate sets are detected and skipped.

**AI export:** export your structured training data in a format built for AI tools. Pick from 8 analysis modules (junk volume audit, structural balance, joint health check, unilateral balance, and more), choose a timeframe, and paste into ChatGPT, Claude, or whatever you use.

**Consistency tracking:** a GitHub-style heatmap of your entire training year, plus a streak counter, consistency score with an 8-week trend, and average workouts per week.

**Lifetime Progress:** a per-muscle journey from Seedling to Legend across 9 tiers based on cumulative sets. Shows estimated time to your next milestone. Kind of gamified, mostly a motivator to not skip leg day for six months.

**Training Manifest:** a dashboard card with a 7-day / 30-day toggle, a volume voyage chart marking your first, peak, and last training days, a body panel for the window, and your top lifts ranked by volume.

**Flex cards:** 9 shareable cards showing your training highlights. An all-time training receipt styled like a shop receipt, volume comparisons (your total lifted vs real-world objects), PR totals, best month, streak length, top exercises, and a yearly heatmap.

---

## Supported apps

| App | Import method |
|-----|--------------|
| **Hevy** | Login sync, Hevy Pro API key, or CSV |
| **Strong** | CSV upload |
| **Lyfta** | API key or CSV |
| **Motra** | Excel or CSV upload |
| **Other** | Generic CSV (auto-detects columns) |

More details at [liftshift.app/supported-apps](https://liftshift.app/supported-apps).

---

## Quick start

<div align="center">
  <img src="./frontend/public/images/steps/Step1.avif" alt="Export data from Hevy app" width="200" />
  <img src="./frontend/public/images/steps/Step2.avif" alt="Upload CSV to LiftShift" width="200" />
  <img src="./frontend/public/images/steps/Step3.avif" alt="Explore analytics dashboard" width="200" />
  <img src="./frontend/public/images/steps/Step4.avif" alt="Get real-time feedback and filter data" width="200" />
</div>

1. Pick your platform (Hevy, Strong, Lyfta, Motra, or generic CSV upload).
2. Choose body map gender and weight unit (kg or lbs).
3. Connect your data (log in, enter an API key, or upload a file).
4. Explore Dashboard, Exercises, History, Muscle Analysis, and Flex.

**Strong CSV users:** LiftShift handles semicolon-delimited files, quoted fields, and unit-suffixed headers like `Weight (kg)`.

---

## Local development

```bash
git clone https://github.com/aree6/LiftShift.git
cd LiftShift
npm install
npm run dev
```

Requires Node.js >= 22. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup details and coding standards.

Prefer Docker? See [DOCKER.md](DOCKER.md): `docker compose --env-file .env.docker.example up --build`, then open `http://localhost:3000`.

**Tech stack:** React 19, TypeScript, Vite, Tailwind CSS, Recharts on the frontend. Node.js + Express + Puppeteer on the backend proxy. All analytics run client-side. The backend only proxies API calls to Hevy and Lyfta.

---

## Troubleshooting

If LiftShift says it "couldn't parse workout dates," your source app is probably using a non-English locale. Switch the Hevy app language to English, export again, and re-upload.

If you synced over an API and see a "Showing newest history only" banner, the source API capped how far back the sync could go. Lifetime totals, PRs, and streaks reflect that partial history. Import a CSV or Excel export for the complete log.

<div align="center">
  <img src="./frontend/public/images/steps/step5.avif" alt="Set Hevy export language to English" width="260" />
</div>

---

## License, Attribution & Security

LiftShift is licensed under **AGPL-3.0** ([LICENSE](LICENSE)). The official deployment is at [liftshift.app](https://liftshift.app). Any deployment on another domain is unofficial and may not follow the same security practices. Don't enter your credentials into an unofficial deployment.

If you deploy LiftShift publicly, you need visible attribution: a link to [liftshift.app](https://liftshift.app) and a link to the source for the version you're running. Removing or hiding attribution is a license violation.

---

## Maintainer

**GitHub:** [aree6](https://github.com/aree6) · [LiftShift repo](https://github.com/aree6/LiftShift)  
**Email:** mohammadar336@gmail.com

---

## Support

- [Buy Me a Coffee](https://www.buymeacoffee.com/aree6)
- [Ko-fi](https://ko-fi.com/aree6)
