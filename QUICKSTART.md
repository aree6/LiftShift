# Quick Start Guide

Get up and running with HevyAnalytics in 5 minutes!

## 🚀 Installation

### Prerequisites
- Node.js v18+ ([download](https://nodejs.org/))
- npm v9+ (comes with Node.js)

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/aree6/HevyAnalytics.git
   cd HevyAnalytics
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

## 📊 Using HevyAnalytics

### First Time Setup

1. **Export from Hevy App**
   - Open the Hevy app on your phone
   - Go to Settings → Export Data
   - Download your workout CSV file

2. **Import into HevyAnalytics**
   - Click the "Upload CSV" button in the app
   - Select your exported CSV file
   - Wait for processing to complete

3. **Explore Your Data**
   - **Dashboard** - Overview of your training
   - **Exercises** - Detailed performance per exercise
   - **History** - Browse individual workout sessions

### Key Features

- **Volume Tracking** - See total weight lifted over time
- **Personal Records** - Track your PRs automatically
- **1RM Estimates** - Get estimated one-rep maxes
- **Filters** - Filter by month or specific dates
- **Offline** - All data stored locally, no uploads

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
src/
├── App.tsx              # Main app component
├── components/          # React components
│   ├── Dashboard.tsx    # Dashboard view
│   ├── ExerciseView.tsx # Exercise analytics
│   ├── HistoryView.tsx  # Workout history
│   └── CSVImportModal.tsx
├── utils/              # Utility functions
│   ├── analytics.ts    # Core analytics logic
│   ├── csvParser.ts    # CSV parsing
│   └── localStorage.ts # Local storage management
└── types.ts            # TypeScript types
```

### Making Changes

1. Edit files in `src/`
2. Changes hot-reload automatically
3. Check browser for results
4. Test production build: `npm run build && npm run preview`

---

## 🌐 Deployment

### Deploy to Vercel (1 minute)

1. Push to GitHub: `git push origin main`
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Click Deploy
5. Done! Your app is live

See [DEPLOYMENT.md](./DEPLOYMENT.md) for other platforms.

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

---

## 📚 Learn More

- [Full README](./README.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Contributing Guidelines](./CONTRIBUTING.md)

---

## 💪 Tips & Tricks

### Export Regularly
Export your Hevy data monthly to keep HevyAnalytics updated.

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
- Open [GitHub Issue](https://github.com/aree6/HevyAnalytics/issues)

---

Happy training! 🏋️💪
