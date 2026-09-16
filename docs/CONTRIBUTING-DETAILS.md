# Contributing details

This document expands on the short guidelines in `CONTRIBUTING.md`.

## Coding standards

### TypeScript

- Use strict mode and explicit types.
- Prefer interfaces for object shapes.
- Avoid `any`; use generics or unions instead.
- Keep functions small and focused.

Example:

```typescript
interface WorkoutData {
  date: Date;
  volume: number;
}

function calculateVolume(sets: Set[]): number {
  return sets.reduce((total, set) => total + set.volume, 0);
}
```

### React components

- Use functional components with hooks.
- Keep components focused and reusable.
- Extract complex logic into utilities or hooks.
- Use meaningful prop names.
- Add JSDoc comments for non-obvious components.

Example:

```typescript
interface CardProps {
  title: string;
  children: React.ReactNode;
}

/**
 * Reusable card component for consistent layout.
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

- Use Tailwind CSS classes.
- Keep styles consistent with the existing design system.
- Prefer Tailwind spacing and color scales.
- Avoid inline styles where possible.

### Naming conventions

- Files: kebab-case for files (`csv-parser.ts`, `Dashboard.tsx`).
- Functions: camelCase (`calculateVolume`, `parseCSV`).
- Classes: PascalCase (`WorkoutParser`, `Analytics`).
- Constants: UPPER_SNAKE_CASE (`DEFAULT_CSV_DATA`, `MAX_FILE_SIZE`).
- Types/Interfaces: PascalCase (`WorkoutSet`, `ExerciseStats`).

## Commit messages

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Formatting-only changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Tests
- `chore`: Tooling and maintenance

### Examples

```
feat(dashboard): add volume trend chart

Implement a new chart component that visualizes total training volume
over time. Users can now track intensity with less friction.

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
docs: update deployment instructions for Netlify + Render
```
