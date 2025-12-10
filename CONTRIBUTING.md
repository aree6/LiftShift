# Contributing to HevyAnalytics

Thank you for your interest in contributing to HevyAnalytics! We welcome contributions from everyone. This document provides guidelines and instructions for contributing.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Enhancements](#suggesting-enhancements)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)

## Code of Conduct

This project is committed to providing a welcoming and inspiring community for all. Please read and respect our code of conduct:

- Be respectful and inclusive
- Be patient and constructive
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js v18 or higher
- npm v9 or higher
- Git
- A text editor (VS Code recommended)

### Development Setup

1. **Fork the repository**
   ```bash
   # Visit https://github.com/aree6/HevyAnalytics
   # Click "Fork" button
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/<your-username>/HevyAnalytics.git
   cd HevyAnalytics
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/aree6/HevyAnalytics.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`

## How to Contribute

### Types of Contributions

We appreciate all types of contributions:

- **Bug Fixes** - Fix bugs and issues
- **Features** - Add new functionality
- **Documentation** - Improve docs and README
- **Performance** - Optimize code and improve performance
- **Tests** - Add or improve test coverage
- **Refactoring** - Improve code quality and structure

## Reporting Bugs

### Before Submitting a Bug Report

- Check if the bug has already been reported in [Issues](https://github.com/aree6/HevyAnalytics/issues)
- Try to reproduce with the latest code
- Collect information about the bug

### How to Submit a Bug Report

Create an issue with:

1. **Clear title** - Briefly describe the issue
2. **Description** - Detailed explanation of the problem
3. **Steps to Reproduce** - Exact steps to reproduce the issue
4. **Expected Behavior** - What should happen
5. **Actual Behavior** - What actually happened
6. **Screenshots** - If applicable
7. **Environment** - Browser, OS, Node version, etc.

**Example:**
```
Title: Volume chart not rendering on Safari

Description:
The volume chart component fails to render on Safari browser.

Steps to Reproduce:
1. Import a CSV file
2. Go to Dashboard tab
3. Observe the volume chart area

Expected: Chart displays with data
Actual: Empty white space where chart should be

Environment: Safari 17.1, macOS 14.0, Node 18.17.0
```

## Suggesting Enhancements

### Before Submitting an Enhancement

- Check if feature already exists or has been suggested
- Describe the specific problem the enhancement solves
- List examples of how the feature would be used

### How to Submit an Enhancement Suggestion

Create an issue with:

1. **Clear title** - Brief description of feature
2. **Current Behavior** - Describe current functionality
3. **Desired Behavior** - Describe desired functionality
4. **Possible Implementation** - Optional technical suggestions
5. **Use Cases** - Why this feature is needed

**Example:**
```
Title: Add export to PDF functionality

Current Behavior:
Users can only view their analytics in the app.

Desired Behavior:
Add ability to export workout summaries as PDF reports.

Use Cases:
- Share training progress with coaches
- Create training records for personal backup
- Print for physical training logs
```

## Pull Request Process

### Before You Start

1. Create an issue describing what you'll work on
2. Get feedback from maintainers before starting major work
3. Create a branch: `git checkout -b feature/your-feature-name`

### Making Changes

1. **Keep commits focused** - One feature/fix per commit
2. **Write clear commit messages** - See [Commit Messages](#commit-messages)
3. **Test your changes** - Run the app and verify functionality
4. **Keep code clean** - Follow [Coding Standards](#coding-standards)

### Submitting a Pull Request

1. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template

3. **PR Description Should Include**
   - Link to related issue: `Fixes #123`
   - Description of changes
   - Screenshots/GIFs if UI changes
   - Testing instructions
   - Any breaking changes

4. **Respond to Feedback**
   - Be open to constructive criticism
   - Make requested changes
   - Respond to reviewer comments

### PR Guidelines

- Use descriptive branch names: `feature/add-pr-tracking` not `fix/stuff`
- Keep PRs focused - don't bundle unrelated changes
- Rebase and squash commits before merging: `git rebase -i upstream/main`
- Ensure CI passes (when available)
- All conversations should be resolved

## Coding Standards

### TypeScript

- Use strict mode - declare types explicitly
- Use interfaces for object shapes
- Avoid `any` type - use generics or union types instead
- Keep functions small and focused

```typescript
// Good
interface WorkoutData {
  date: Date;
  volume: number;
}

function calculateVolume(sets: Set[]): number {
  return sets.reduce((total, set) => total + set.volume, 0);
}

// Avoid
function calculateVolume(sets: any): any {
  return sets.reduce((total: any, set: any) => total + set.volume, 0);
}
```

### React Components

- Use functional components with hooks
- Keep components focused and reusable
- Extract complex logic to utilities
- Use meaningful prop names
- Add JSDoc comments for complex components

```typescript
// Good
interface CardProps {
  title: string;
  children: React.ReactNode;
}

/**
 * Reusable card component for consistent layout
 */
export function Card({ title, children }: CardProps) {
  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="font-bold text-lg">{title}</h3>
      {children}
    </div>
  );
}
```

### Styling

- Use Tailwind CSS classes
- Keep component styles consistent with existing design
- Use spacing and color system from Tailwind
- Avoid inline styles

### Naming Conventions

- **Files**: kebab-case for files (`csv-parser.ts`, `Dashboard.tsx`)
- **Functions**: camelCase (`calculateVolume`, `parseCSV`)
- **Classes**: PascalCase (`WorkoutParser`, `Analytics`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_CSV_DATA`, `MAX_FILE_SIZE`)
- **Types/Interfaces**: PascalCase (`WorkoutSet`, `ExerciseStats`)

## Commit Messages

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `test:` Adding or updating tests
- `chore:` Build, dependencies, tooling

### Examples

```
feat(dashboard): add volume trend chart

Implement a new chart component that visualizes total training volume
over time. Users can now easily track their training intensity.

Fixes #42
```

```
fix(csv-parser): handle missing weight fields gracefully

- Add validation for missing weight_kg column
- Default to 0 for cardio exercises
- Add unit test for edge case

Fixes #38
```

```
docs: update deployment instructions for Vercel
```

## Questions?

- Check existing issues and discussions
- Ask in GitHub Discussions
- Open a new issue with the question tag

---

## Acknowledgments

Thank you for contributing! Your efforts help make HevyAnalytics better for everyone. 🙏
