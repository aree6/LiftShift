# Quick Start Guide

Get up and running with LiftShift in 5 minutes!

## 🚀 Installation

### Prerequisites
- Node.js v22+ ([download](https://nodejs.org/))
- npm v10+ (comes with Node.js)

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/aree6/LiftShift.git
   cd LiftShift
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

That's it! The app is now running locally. 🎉

---

## 📊 Using LiftShift

### First Time Setup

1. **Select your platform**
    - Hevy (login, Pro API key, or CSV)
    - Strong (CSV)
    - Lyfta (API key or CSV)
    - Motra (Excel)
    - Other (generic CSV)

2. **Complete setup**
    - File import: choose body type + unit, then upload your export (Strong CSV variants, Motra .xlsx, and generic CSVs are all auto-detected)
    - Hevy: choose body type + unit, then log in, paste a Pro API key, or import a Hevy CSV
    - Lyfta: choose body type + unit, then paste an API key or import a Lyfta CSV

   API syncs pull newest workouts first and the source API can cap how far back one sync goes. If that happens you'll see a "Showing newest history only" banner. For the complete history, use a file import.

3. **Explore your data**
    - **Dashboard** - Overview of your training, including the Training Manifest card
    - **Exercises** - Detailed performance per exercise
    - **History** - Browse individual workout sessions
    - **Muscle Analysis** - Heatmaps and per-muscle breakdowns
    - **Flex** - 9 shareable cards, including an all-time training receipt

### Key Features

- **Muscle heatmaps** - See which muscles you train and which you neglect
- **Personal Records** - Seven PR types (weight, 1RM, set volume, session volume, reps, weighted reps, distance) in all-time and 1-month tiers
- **Plateau detection** - Per-exercise status with concrete next-session suggestions
- **Set-by-set feedback** - 19 coaching scenarios on every set you log
- **Strength imbalance** - 13 exercise-pair ratios against population statistics
- **Calendar filtering** - Pick any date range, every chart recalculates
- **Multi-app merge** - Combine Hevy, Strong, Lyfta, Motra, and CSVs into one dashboard
- **Flex cards + Training Manifest** - Shareable summaries and a voyage-style dashboard card
- **AI export** - Structured data with 8 analysis modules for ChatGPT, Claude, and the rest
- **Offline** - All data stored locally, analysis runs on your device

### PR Definitions

LiftShift tracks seven PR types: **weight, 1RM, set volume, session volume, reps, weighted reps, and distance**. Each comes in two tiers:

- **Gold**: all-time best for the exercise
- **Silver**: best in the last month

It also flags **premature PRs** (a big jump you couldn't sustain) and **PR droughts** (no new records in a while).

---

## 🛠️ Development

### Build Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

### Project Structure

```
frontend/
├── App.tsx              # Main app component
├── index.tsx            # React entry
├── pages/               # Public pages (landing, how-it-works, features, faq, metrics, supported-apps)
├── components/          # React components (dashboard, exerciseView, historyView, flexView, landing, ...)
├── utils/               # Utility functions
│   ├── analysis/        # Core analytics logic
│   ├── csv/             # CSV / Excel parsing
│   └── storage/         # Local storage management
backend/                 # Express proxy for Hevy / Lyfta API sync
```

### Making Changes

1. Edit files in `frontend/`
2. Changes hot-reload automatically
3. Check browser for results
4. Test production build: `npm run build && npm run preview`

---

## 🌐 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for backend (Render/Railway) + frontend (Netlify).

---

## 🐛 Troubleshooting

### Port 3000 already in use

```bash
# Use different port
npm run dev -- --port 3001
```

### Build fails

```bash
# Clear cache and reinstall
rm -rf node_modules dist
npm install
npm run build
```

### CSV import not working

- Ensure CSV is from Hevy app export
- Check file format is `.csv`
- Try with smaller file first

### "Load failed" error on deployed site

If a user gets "Load failed" or "Failed to fetch" on the **deployed** site (not local dev), this is typically caused by:

1. **Content blockers / Ad blockers** - Safari and browser extensions can block API requests
2. **VPNs** - Can block or modify network requests
3. **Corporate/school firewalls** - May block external API calls

**Solutions for users:**
- Disable content blockers for the site (Safari → Settings → Extensions)
- Try a different network (switch WiFi ↔ cellular)
- Try an incognito/private window
- Use a different browser (Chrome, Firefox)

### Works on Mac but "Load failed" on phone (local dev)

If you open the dev server from your phone (for example `http://192.168.x.x:3000`) and actions like Hevy login fail with a network error, it usually means the frontend is trying to call the backend at `http://localhost:...`.

On your phone, `localhost` points to the phone itself.

Fix:

- Keep using the LAN URL for the frontend, and ensure the frontend uses same-origin `/api/...` (Vite will proxy it to the backend).
- Alternatively, set `VITE_BACKEND_URL` to your Mac's LAN IP (example: `http://192.168.x.x:5050`).

---

## 📚 Learn More

- [Full README](./README.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Contributing Guidelines](./CONTRIBUTING.md)

---

## 💪 Tips & Tricks

### Export Regularly
Export your Hevy data monthly to keep LiftShift updated.

### Use Filters
Filter by month to see training trends and seasonal patterns.

### Monitor PRs
Check the Exercises tab to see when you hit new personal records.

### Share Progress
Export a flex card or your all-time training receipt to share progress with coaches/friends.

---

## ❓ Need Help?

- Check [Troubleshooting](#troubleshooting) section
- Read [Full README](./README.md)
- Open [GitHub Issue](https://github.com/aree6/LiftShift/issues)

---

Happy training! 🏋️💪
