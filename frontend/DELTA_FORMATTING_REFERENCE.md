# Delta Percentage Formatting Reference

## Logic Explanation

The "x" format represents **total performance multiplier**, not the increase amount.

**Formula**: `Total Multiplier = 1 + (Percentage Increase / 100)`

## Conversion Table

| Percentage Increase | Total Performance | Display Format |
|-------------------|-------------------|----------------|
| 0% increase | 1.0x baseline | 0% (below threshold) |
| 50% increase | 1.5x baseline | 50% (below threshold) |
| 100% increase | 2.0x baseline | 100% (below threshold) |
| 149% increase | 2.49x baseline | 149% (below threshold) |
| **150% increase** | **2.5x baseline** | **2.5x** ✨ |
| 175% increase | 2.75x baseline | 2.8x ✨ |
| **200% increase** | **3.0x baseline** | **3x** ✨ |
| 250% increase | 3.5x baseline | 3.5x ✨ |
| **300% increase** | **4.0x baseline** | **4x** ✨ |

## Key Points

- **< 150%**: Shows as regular percentage (e.g., "100%", "125%")
- **≥ 150%**: Shows as total multiplier (e.g., "2.5x", "3x")
- **Units always present**: Either "%" or "x"
- **Logic**: "x" = baseline (1x) + increase (percentage/100)

## Examples

- **100% increase** → Performance doubled → **2x total**
- **200% increase** → Performance tripled → **3x total**  
- **300% increase** → Performance quadrupled → **4x total**

This makes the "x" format intuitive: it directly tells you how many times better the performance is compared to baseline.
