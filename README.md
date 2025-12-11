<div align="center">
  <img src="./HevyAnalytics.png" alt="HevyAnalytics Logo" width="200" height="200" />
</div>

# HevyAnalytics 🏋️

**A comprehensive workout visualizer that transforms your Hevy app CSV exports into powerful insights.**
  
  [![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
  [![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)
</div>

---

## 🎬 Quick Tutorial

### Getting Started in 4 Steps

<div align="center">
  <img src="./Step1.png" alt="Export data from Hevy app" width="200" />
  <img src="./Step2.png" alt="Upload CSV to HevyAnalytics" width="200" />
  <img src="./Step3.png" alt="Explore analytics dashboard" width="200" />
  <img src="./Step4.png" alt="Get real-time feedback and filter data" width="200" />
</div>

**Step 1: Export Your Data**
- Open the Hevy app on your phone
- Go to Settings → Export Data
- Download your workout CSV file

**Step 2: Upload to HevyAnalytics**
- Open HevyAnalytics (run `npm run dev` locally or visit the deployed site)
- Click the **Upload CSV** button at the top
- Select your downloaded CSV file
- Watch as your data loads instantly into the app

**Step 3: Explore Your Analytics**
- **Dashboard** - See your training volume, workout frequency, and key metrics at a glance
- **Exercises** - Check personal records, 1RM estimates, and performance trends for each lift
- **History** - Review detailed logs of every workout session with filtering options

**Step 4: Get Insights & Filter**
- 🎯 **Filter by Month** - Use the date dropdown to focus on specific training periods
- 📊 **Real-Time Feedback** - Get set-by-set wisdom indicators while browsing your data:
  - ✅ Green (Success) - You're hitting your targets
  - ⚠️ Yellow (Warning) - Performance is changing
  - 🔥 Red (Danger) - Significant drop-off detected
- 💾 **Your Data Stays Private** - Everything is saved locally in your browser—nothing is sent to servers

---

## 📋 Table of Contents

- [HevyAnalytics 🏋️](#hevyanalytics-️)
  - [🎬 Quick Tutorial](#-quick-tutorial)
    - [Getting Started in 4 Steps](#getting-started-in-4-steps)
  - [📋 Table of Contents](#-table-of-contents)
  - [✨ Features](#-features)
  - [🚀 Quick Start](#-quick-start)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
  - [📖 Usage](#-usage)
    - [Getting Your Hevy Data](#getting-your-hevy-data)
    - [Dashboard Tab](#dashboard-tab)
    - [Exercises Tab](#exercises-tab)
    - [History Tab](#history-tab)
    - [Set-by-Set Wisdom](#set-by-set-wisdom)
  - [🌐 Deployment](#-deployment)
    - [Deploy to Vercel (Recommended)](#deploy-to-vercel-recommended)
    - [Deploy to Netlify](#deploy-to-netlify)
    - [Deploy to GitHub Pages](#deploy-to-github-pages)
  - [📁 Project Structure](#-project-structure)
  - [🛠️ Technologies](#️-technologies)
  - [🤝 Contributing](#-contributing)
  - [📄 License](#-license)
  - [💬 Support](#-support)

---

## ✨ Features

- **📊 Dashboard Analytics** - Get at-a-glance insights into your training patterns with visual summaries
- **💪 Exercise Performance Tracking** - Monitor individual exercise progress with personal records (PRs) and 1RM estimates
- **📈 Workout History Visualization** - Track your volume, duration, and intensity over time
- **🔍 Set-by-Set Analysis** - Real-time wisdom feedback on your workout performance with training goal recommendations
- **📅 Temporal Filtering** - Filter data by month or specific date for detailed analysis
- **📁 CSV Import** - Upload Hevy app CSV exports directly into the app
- **💾 Local Storage** - Your data is saved locally in your browser—no server uploads
- **🎨 Dark Mode UI** - Beautiful, easy-on-the-eyes dark theme with responsive design

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+ and npm v9+
- A browser with local storage support

### Installation

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
   The app will be available at `http://localhost:3000`

4. **Build for production**
   ```bash
   npm run build
   ```

---

## 📖 Usage

### Getting Your Hevy Data

1. Open the [Hevy app](https://www.hevyapp.com/)
2. Export your workout data as a CSV file
3. In HevyAnalytics, click the **Upload CSV** button
4. Select your exported CSV file
5. Explore your workouts across three main views:

### Dashboard Tab
- **Volume Trends** - See your total training volume over time
- **Workout Distribution** - Understand when you're training
- **Key Metrics** - Quick stats on your training

### Exercises Tab
- **Exercise Performance** - Track individual lifts
- **Personal Records** - See your best lifts and their dates
- **1RM Estimates** - Calculated using standard formulas
- **Historical Data** - Detailed logs for each exercise

### History Tab
- **Detailed Logs** - Review every workout session
- **Filter by Date** - Dive deep into specific training days
- **Session Metrics** - Duration, set count, average reps

### Set-by-Set Wisdom
Get real-time feedback on your sets:
- ✅ **Success** - You're hitting your targets
- ⚠️ **Warning** - Performance changing, monitor closely
- 🔥 **Danger** - Significant drop-off detected
- 💡 **Info** - Training insights for your goals

---

## 🌐 Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Select your GitHub repository
   - Click "Import"

3. **Configure**
   - Framework: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - No environment variables needed (app is client-side only)

4. **Deploy**
   - Click "Deploy"
   - Your app will be live in seconds!

### Deploy to Netlify

1. **Push to GitHub** (same as above)

2. **Connect to Netlify**
   - Go to [netlify.com](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Select your GitHub repository

3. **Configure**
   - Build command: `npm run build`
   - Publish directory: `dist`

4. **Deploy**
   - Click "Deploy"

### Deploy to GitHub Pages

1. **Update `package.json`** with your repository name:
   ```json
   "homepage": "https://aree6.github.io/HevyAnalytics/"
   ```

2. **Install gh-pages**
   ```bash
   npm install --save-dev gh-pages
   ```

3. **Update `package.json` scripts**
   ```json
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```

4. **Deploy**
   ```bash
   npm run deploy
   ```

---

## 📁 Project Structure

```
HevyAnalytics/
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx        # Main dashboard view
│   │   ├── ExerciseView.tsx      # Exercise performance analysis
│   │   ├── HistoryView.tsx       # Detailed workout history
│   │   └── CSVImportModal.tsx    # CSV upload modal
│   ├── utils/
│   │   ├── analytics.ts         # Core analytics logic
│   │   ├── csvParser.ts         # CSV parsing utilities
│   │   ├── localStorage.ts      # Local storage management
│   │   ├── categories.ts        # Exercise categorization
│   │   └── masterAlgorithm.ts   # Set wisdom algorithm
│   ├── App.tsx                  # Main application component
│   ├── types.ts                 # TypeScript type definitions
│   ├── constants.ts             # App constants
│   └── index.tsx                # React entry point
├── index.html                   # HTML template
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
├── package.json                # Dependencies and scripts
├── .gitignore                  # Git ignore rules
├── .env.example                # Environment variables template
└── README.md                   # This file
```

---

## 🛠️ Technologies

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool (fast development and production builds)
- **Recharts** - Data visualization
- **Tailwind CSS** - Styling
- **Lucide React** - Icon library
- **date-fns** - Date utilities

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
   ```bash
   git clone https://github.com/aree6/HevyAnalytics.git
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Follow the existing code style
   - Keep components focused and reusable
   - Add comments for complex logic

4. **Test your changes**
   ```bash
   npm run dev
   ```

5. **Commit and push**
   ```bash
   git add .
   git commit -m "Add amazing feature"
   git push origin feature/amazing-feature
   ```

6. **Create a Pull Request**
   - Describe your changes clearly
   - Link any related issues

For more details, see [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](./LICENSE) file for details.

---

## 💬 Support

- **Issues** - Found a bug? [Open an issue](https://github.com/aree6/HevyAnalytics/issues)
- **Discussions** - Have a question? [Start a discussion](https://github.com/aree6/HevyAnalytics/discussions)
- **Documentation** - Check out [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup

---

<div align="center">
  Made with 💪 by fitness enthusiasts who love data
  
  ⭐ If you find this useful, please consider giving it a star!
</div>
