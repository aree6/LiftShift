# Quick Start Guide

Get up and running with LiftShift in 5 minutes!

## 🚀 Installation

### Prerequisites
- Node.js v18+ ([download](https://nodejs.org/))
- npm v9+ (comes with Node.js)

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
   - Strong (CSV)
   - Hevy (Login or CSV)

2. **Complete setup**
   - Strong: choose body type + unit, then import Strong CSV
   - Hevy: choose body type + unit, then Continue to login/sync (or import Hevy CSV)

  Strong CSV imports support common export variants, including semicolon-delimited (`;`) files with quoted fields and unit-suffixed headers like `Weight (kg)`.

3. **Explore your data**
   - **Dashboard** - Overview of your training
   - **Exercises** - Detailed performance per exercise
   - **History** - Browse individual workout sessions

### Key Features

- **Volume Tracking** - See total weight lifted over time
- **Personal Records** - Track your PRs automatically
- **1RM Estimates** - Get estimated one-rep maxes
- **Filters** - Filter by month or specific dates
- **Offline** - All data stored locally, no uploads

### PR Definitions

- **PR**: Best-ever **weight** for an exercise (shown with **absolute** change)
- **Volume PR**: Best-ever **single-set volume** for an exercise (`weight × reps`, across all history; shown with **percent** change)

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
├── index.html           # Vite HTML entry
├── index.tsx            # React entry
├── App.tsx              # Main app component
├── components/          # React components
│   ├── Dashboard.tsx    # Dashboard view
│   ├── ExerciseView.tsx # Exercise analytics
│   ├── HistoryView.tsx  # Workout history
│   └── CSVImportModal.tsx
├── utils/               # Utility functions
│   ├── analysis/        # Core analytics logic
│   ├── csv/             # CSV parsing
│   └── storage/         # Local storage management
└── types.ts             # TypeScript types
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
Take screenshots or export data to share progress with coaches/friends.

---

## ❓ Need Help?

- Check [Troubleshooting](#troubleshooting) section
- Read [Full README](./README.md)
- Open [GitHub Issue](https://github.com/aree6/LiftShift/issues)

---

Happy training! 🏋️💪
