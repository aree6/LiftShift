<div align="center">
  <img src="./HevyAnalytics.png" alt="HevyAnalytics Logo" width="200" height="200" />
</div>

# HevyAnalytics 🏋️

**Transform your Hevy app CSV exports into powerful workout insights.**

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)

---

## 🎬 Quick Start

<div align="center">
  <img src="./Step1.png" alt="Export data from Hevy app" width="150" />
  <img src="./Step2.png" alt="Upload CSV to HevyAnalytics" width="150" />
  <img src="./Step3.png" alt="Explore analytics dashboard" width="150" />
  <img src="./Step4.png" alt="Get real-time feedback and filter data" width="150" />
</div>

1. **Export** your workout data from the Hevy app
2. **Upload** the CSV file to HevyAnalytics
3. **Explore** your analytics across Dashboard, Exercises, and History tabs
4. **Get insights** with real-time feedback and flexible filtering

---

## ✨ Features

- 📊 **Dashboard Analytics** - Volume trends, workout distribution, key metrics
- 💪 **Exercise Tracking** - Personal records, 1RM estimates, performance trends
- 📈 **History Visualization** - Detailed workout logs with date filtering
- 🔍 **Set-by-Set Wisdom** - Real-time feedback on your performance
- 💾 **Local Storage** - All data saved in your browser, nothing uploaded
- 🎨 **Dark Mode UI** - Beautiful, responsive design

---

## 🚀 Installation

```bash
git clone https://github.com/aree6/HevyAnalytics.git
cd HevyAnalytics
npm install
npm run dev
```

Build: `npm run build`

**Requirements:** Node.js v18+ and npm v9+

---

## 📖 Usage

### Dashboard
- View your total training volume over time
- Understand your workout distribution
- Quick stats on your training patterns

### Exercises
- Track individual lift performance
- See personal records and 1RM estimates
- Review detailed historical data

### History
- Review every workout session
- Filter by specific dates
- View session duration, sets, and reps

### Set-by-Set Wisdom
- ✅ **Success** - Hitting your targets
- ⚠️ **Warning** - Performance changing
- 🔥 **Danger** - Significant drop-off
- 💡 **Info** - Training insights

---

## 🌐 Deploy

### Vercel (Recommended)
1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project
3. Select your repo, configure:
   - Framework: **Vite**
   - Build: `npm run build`
   - Output: `dist`
4. Deploy

### Netlify
1. Push to GitHub
2. Go to [netlify.com](https://netlify.com) → New site
3. Select your repo, set:
   - Build: `npm run build`
   - Publish: `dist`
4. Deploy

### GitHub Pages
```bash
npm install --save-dev gh-pages
# Update package.json:
# "homepage": "https://aree6.github.io/HevyAnalytics/"
# Add to scripts: "deploy": "gh-pages -d dist"
npm run deploy
```

---

## 📁 Project Structure

```
HevyAnalytics/
├── components/
│   ├── Dashboard.tsx
│   ├── ExerciseView.tsx
│   ├── HistoryView.tsx
│   └── CSVImportModal.tsx
├── utils/
│   ├── analytics.ts
│   ├── csvParser.ts
│   ├── localStorage.ts
│   ├── categories.ts
│   └── masterAlgorithm.ts
├── App.tsx
├── types.ts
├── constants.ts
└── index.tsx
```

---

## 🛠️ Tech Stack

React 19 • TypeScript • Vite • Recharts • Tailwind CSS • Lucide React • date-fns

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test: `npm run dev`
5. Commit and push
6. Open a Pull Request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

---

## 📄 License

MIT License - see [LICENSE](./LICENSE)

---

## 💬 Support

- [Open an issue](https://github.com/aree6/HevyAnalytics/issues) for bugs
- [Start a discussion](https://github.com/aree6/HevyAnalytics/discussions) for questions
- Check [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup

---

<div align="center">
  Made with 💪 by fitness enthusiasts who love data
  
  ⭐ Star this repo if you find it useful!
</div>
