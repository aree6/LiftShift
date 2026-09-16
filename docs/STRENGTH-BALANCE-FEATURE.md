# How strength imbalance works

LiftShift compares your strength across related exercise pairs (bench vs.
overhead press, rows vs. bench, squat vs. bench, curls vs. pushdowns…) against
typical ratios from population statistics, and surfaces a **watch** or
**flag** when one side of a pair sits far outside its typical band — with a
trend chart so you can watch a gap close over time.

This document is the feature's working manual: the research behind the
ratios, exactly how the math runs on your data, how the copy is framed, and
how it all fits together in the dashboard. Written for anyone who wants to
understand the feature, extend it, or just know what the numbers mean.

---

## 1. The idea, in one paragraph

For two related exercises — same joint, same action family — lifters reliably
show predictable strength ratios. Overhead press is usually about 60–70% of
bench press. Squat is usually 1.3–1.5× bench. Rows are usually 85–95% of
bench. When *your* ratio falls far outside that band, it usually means one of
four things:

- a genuine strength imbalance (delts lagging, back lagging, quads vs. hamstrings)
- technique or range-of-motion conventions
- programming (you train one movement and skip the other)
- a logging artifact (weird weight units, a mis-typed set, a one-off PR day)

The feature computes your ratio from your logs and flags outliers. That's all
it does. It never claims your form is wrong — it can't see form. The copy is
deliberately soft: *"your X is at about 60% of the strength of your Y. Most
lifters sit around 100–135%."* These are **diagnostic hints, not diagnoses.**

---

## 2. What the research says

Researched August 2026. The big-three ratios are the strongest evidence that
"golden ratios" exist: a 2024 JSAMS study of **809,986 drug-tested,
unequipped competition entries** found squat:bench, deadlift:bench, and
deadlift:squat are nearly flat from the 10th to the 90th percentile and across
weight classes. Assistance-lift ratios are crowd statistics rather than
science — they come from StrengthLevel (~28M users) and similar aggregators —
so their bands are intentionally wider.

### The pair registry (`ratioRegistry.ts`)

| Pair A : B (1RM) | Expected A/B | Hard band | Basis | Research confidence |
|---|---|---|---|---|
| Bench : OHP | 1.43–1.67 | 1.25–1.90 | ExRx/Kilgore + StrengthLevel (agree within ~3%) | High |
| Shoulder Press : Lateral Raise | 1.70–2.90 | 1.20–3.30 | StrengthLevel lateral-raise tables (1.2M lifts) | High |
| Squat : Bench | 1.30–1.50 | 1.20–1.70 | JSAMS 2024; OpenPowerlifting; ExRx | High |
| Deadlift : Bench | 1.50–1.80 | 1.40–2.00 | JSAMS 2024; OpenPowerlifting; ExRx | High |
| Deadlift : Squat | 1.10–1.25 | 1.00–1.35 | JSAMS 2024; OpenPowerlifting; ExRx | High |
| Row : Bench | 0.85–0.95 | 0.70–1.15 | StrengthLevel + coaching consensus | Medium |
| Lat Pulldown : Bench | 0.80–0.90 | 0.70–1.05 | StrengthLevel | Medium |
| Incline Bench : Bench | 0.85–0.95 | 0.70–1.15 | StrengthLevel | Medium |
| Front Squat : Squat | 0.80–0.85 | 0.65–1.00 | StrengthLevel + coaching consensus | Medium |
| Leg Curl : Leg Extension | 0.60–0.80 | 0.40–1.00 | StrengthLevel + isokinetic H:Q research | Medium |
| Curl : Pushdown | 0.75–1.00 | 0.60–1.20 | StrengthLevel | Medium |
| Skullcrusher : Pushdown | 0.71–0.91 | 0.55–1.15 | StrengthLevel | Medium |
| RDL : Deadlift | 0.75–0.85 | 0.60–1.05 | StrengthLevel | Medium |

Each pair carries a **research confidence** separate from the severity of
*your* finding. A flag on a high-research pair (squat:bench) is a strong
signal; a flag on a medium-research pair (row:bench) is worth a look but is
more of a hint. The UI keeps these two concepts honest and distinct.

### Why the bands are wide

The community (r/Fitness diagnostic threads, SymmetricStrength users) rejects
single-number cutoffs — *"there is no set ratio, everyone is different."*
Bands are wide on purpose: flags fire only for clear outliers. Also,
untrained lifters have compressed ratios (untrained squat:bench ≈ 0.92 vs.
1.38 elite), which is why the feature refuses to say anything at all until
you have enough logged sessions (see §3.5).

Bodyweight cancels out of a ratio of two e1RMs — except for bodyweight-based
exercises (pull-ups, push-ups), where total load is bodyweight + added
weight. Pull-up pairs need a bodyweight setting, so **v1 skips them** and
uses pulldown/row as the vertical-pull proxies.

---

## 3. How it works, step by step

Everything below runs locally in your browser on your imported sets.

### 3.1 From exercise titles to movements

Your raw exercise titles ("BENCH PRESS (BARBELL) – 5/3/1", "Db side raises")
rarely match anything cleanly, so every title is first run through the app's
exercise-name resolver (the same alias/fingerprint system used everywhere in
LiftShift), which handles case, punctuation, aliases, and fuzzy matches.
Resolved names are then mapped to one of the 15 registry movements (bench,
incline bench, overhead press, lateral raise, squat, front squat, deadlift,
RDL, row, pulldown, leg curl, leg extension, curl, pushdown, skullcrusher)
via the canonical names in `ratioRegistry.ts`. Titles that resolve to nothing
are simply ignored.

### 3.2 The 90-day window

Strength is a rolling concept, so the analysis only looks at the last 90 days
of training. Two details matter:

- The window is **anchored to the newest valid session in the data**, not the
  clock. If you filter the dashboard to a historical period (say, all of
  2025), the window slides back to that period's newest session and the card
  still works. A calendar filter can never silently empty the findings.
- Warm-up sets and **future-dated sets** (a mis-dated import, a typo in a
  date field) are excluded when choosing the anchor — one rogue set can't
  shift the whole window forward and hide your real recent training.

### 3.3 Strength per movement

For each movement, LiftShift walks every qualifying set in the window:

- must have a parsed date inside the window,
- must be a working set (warm-ups excluded),
- must have `weight_kg > 0`,
- must have **5–15 reps** (heavy triples and 20-rep grinders are out of the
  e1RM formula's sweet spot).

Each set gets an estimated 1-rep max with the Epley formula:

```
e1RM = weight × (1 + reps / 30)
```

Per-arm exercises (lateral raises, dumbbell presses, dumbbell curls…) are
**doubled** so their per-arm load compares fairly against bilateral totals.

Sessions are grouped by calendar day, and each day contributes its **best**
e1RM (your strongest set that session). Then:

```
strength = p75 of your 5 most recent session bests
```

Two choices here are worth explaining:

- **Why the 5 most recent, not the 5 heaviest?** A heavy block from 80 days
  ago is history — if you've detrained since, it shouldn't inflate your
  current strength. The most-recent-5 keeps the metric honest about *now*.
- **Why p75 and not the max?** One freak PR day shouldn't define your
  profile. The 75th percentile of your recent sessions is robust to a
  one-off spike while still reflecting real strength.

Both sides of a pair need **at least 2 sessions** in the window, and the data
overall needs **at least 3 sessions**, before anything is reported. This is
the beginner-suppression guard: with too little data the ratios are
compressed and meaningless.

### 3.4 Severity tiers

Each pair's ratio is compared against its bands:

| State | Condition | What happens |
|---|---|---|
| `ok` | ratio inside the expected band | nothing is surfaced |
| `watch` | outside expected, inside hard band | medium-confidence finding |
| `flag` | outside the hard band | high-confidence finding |

Boundary comparisons use a tiny epsilon (`BAND_EPS = 1e-9`) so round weights
that land exactly on a band edge (row 95 kg vs. bench 100 kg → 0.95) don't
flip between `ok` and `watch` on float noise.

### 3.5 Selecting what to show

Up to **3 findings** are surfaced, with two rules:

1. **Deduplicated by the lagging movement.** Bench appears in six pairs — a
   weak bench would otherwise generate "your bench is behind your squat",
   "…behind your deadlift", "…behind your rows" in a row. Each lagging
   movement is shown at most once, preferring the pair with the largest
   deviation from its band.
2. **Flags first, one watch slot reserved.** High-confidence flags always
   outrank watches; a watch gets a slot only if one is left, and a flag can
   never be displaced by a watch — even with a smaller max.

Findings are ordered by deviation from the hard band (overshoot), so the most
lopsided pair leads.

### 3.6 The weekly history

For every 7-day bucket where **both** movements of a pair were trained, the
ratio of that week's best e1RMs is recorded — `history = [{weekStart, ratio}, …]`,
oldest first. This powers the trend chip and the chart. It's a cheap byproduct
of the same session-bests pass, so the card costs almost nothing extra to
compute.

---

## 4. The trend: is the gap closing or widening?

This is the part people actually care about: *am I fixing it?* The answer is
deliberately anchored to the **recent past, not the whole history.**

**The recent window.** The last ~5 weeks of data plus the current value
(at least 2 points). Why? Because "improved for three months, slipped for
the last month" should read **widening** — the question is how you're doing
*lately*.

**The fit.** A least-squares regression line is fit through the exact same
series the chart plots: the 3-week smoothed weekly points with the raw
current value appended as the "now" point. The smoothing spreads a single
weird week across three points and the regression resists it, so an
isolated heavy/light week is far less likely to flip the verdict than a
raw first/last comparison would. The reported start/end percentages are
the **actual first and last points of that series** (not fitted values),
so every number the chip shows is a value you can see on the graph.

**The direction.** "Closing" = the fitted line moves *toward* the expected
band's midpoint; "widening" = it moves away.

**The chip.** Output in the same units as the sentence, with the span in
months (not weeks — months read better):

```
Gap closing · 80% → 120% over 2 months
Gap widening · 75% → 60% over 1 month
```

All values are copy-rounded to the nearest 5%. If the displayed start and
end values round to the same number — or the fitted line's endpoints do —
the trend is `steady` and no chip is shown.

**The rounding guard.** The current % in the sentence is also rounded to the
nearest 5% — except when that would round an *out-of-band* value onto the
band's displayed edge (e.g. a real 84.8% reading as "85%" next to an
"85–95%" band). Such borderline values keep one decimal ("84.8%") so the
copy can never make an imbalance look like it's inside the typical range.

---

## 5. The chart

Each finding's chart is a recharts line chart drawn entirely in the
sentence's units — the laggard as a % of the stronger lift — so the line,
the dot, and the words always agree:

- **The green band.** The expected range (e.g. 100–135%) is shaded green and
  labeled with its range.
- **The line.** Your weekly laggard % over the last 3 months, smoothed with a
  simple 3-point centered moving average so heavy weeks and deload weeks
  don't zigzag it. Weeks where the imbalance briefly flipped sides plot
  above the band.
- **The y-axis is stable.** It's scaled from the band and your current value
  only — never from the weekly series — so a rare 300%+ flip week clips at
  the top edge of a fixed-scale chart instead of stretching the whole graph
  into a sliver.
- **The dot.** Your current level, as its own data point ("now") at the end
  of the line, labeled with the rounded value (e.g. 60%). Because it's a
  real point in the series, the line and dot always meet.
- **The x-axis.** Downsampled with the app's standard tick helper (~4–5
  labels, "now" always kept), so a year of weekly points never clutters.
- **Tooltip.** Hover any point for its week and value.

### Why sentence units matter (a cautionary tale)

An earlier version plotted "the weaker side as % of the stronger side" each
week — always ≤ 100%. It looked smooth, but for pairs whose band sits above
100 (squat:bench expects 130–150%), the line could *fall* while the ratio
*improved*, and the trend chip could say "widening" while the sentence said
the gap was closing. Lesson: one unit everywhere — the sentence's — or the
chart lies. The stable y-axis, not unit-flipping, is how spikes are handled.

---

## 6. The copy

### The finding sentence

```
Your Overhead Triceps Extension is at about 65% of the strength of your
Cable Hammer Curl. Most lifters sit around 100–135% of their curls.
```

Notes for anyone editing copy:

- **No "Heads up:", no colon.** The sentence starts with the finding.
- **"of the strength of"** is deliberate — it says *what* the percentage is
  of (estimated 1-rep-max strength), because "60% of your curls" alone is
  ambiguous (60% of the strength? the volume?).
- The **laggard** (weaker side) is always the subject; the strong lift is
  only ever the reference, never the problem.
- No em dashes, plain sentences, exercise names are clickable segments that
  deep-link to the exercise view.

### The TL;DR

With 2+ findings, a one-line summary is synthesized at the **muscle-group**
level, not the exercise level:

```
TL;DR Your chest is likely lagging behind your back. Your triceps are
lagging behind your biceps.
```

Same-group pairs (curls vs. pushdowns — both arms) are mapped to the muscles
they train (triceps vs. biceps) so the summary stays muscle-focused. Pairs
whose two sides train the same muscle (skullcrusher vs. pushdown) are skipped
rather than saying something silly.

### Framing guardrails

- No form claims, no injury claims. Copy lists possible causes; the "possible
  causes" tail was removed from the sentence, and the card footer says the
  gap "can be a real imbalance, different training history, or a logging
  difference — a hint for your next sessions, not a diagnosis."
- Ranges, not verdicts.
- Sourcing is cited honestly: "population statistics from roughly 28 million
  logged lifts."
- Never blocks the user: informational, tiered, and the overview alert is a
  single line.

---

## 7. Where it lives in the app

### Overview card (mobile + desktop)

When findings exist, the dashboard Overview card shows a one-line alert:

```
Strength imbalance detected · 2 findings   <TL;DR on desktop only>   See details →
```

The TL;DR text is hidden on mobile to keep the row compact. **See details**
smooth-scrolls to the Strength Imbalance card. The scroll is retried a few
times after the click because the card mounts lazily (skeleton first, real
content after) — without the retries, the lazy load shifts the layout and the
card lands in the wrong place, which was a real mobile bug.

### The Strength Imbalance card

Sits in the dashboard grid right of the Injury Risk card, above the AI and
Volume Density cards. Structure, top to bottom:

1. Header — "Strength Imbalance", subtitle "Compared by estimated 1-rep max ·
   population statistics", and a count chip.
2. A **segment control** — one pill per finding, labeled with the issue name
   ("Chest vs Mid-back", "Triceps vs Biceps"), centered above the finding.
   With many findings the control row scrolls horizontally (`overflow-x-auto`
   with a hidden scrollbar) so it never breaks the layout.
3. The finding — sentence, trend chip, chart. One finding at a time.
4. A short footer paragraph and the TL;DR when present.

The empty state ("No imbalances outside typical ranges right now") is honest
and non-alarming.

### Module map

```
frontend/utils/analysis/strengthBalance/
  ratioRegistry.ts        // 15 movements, 13 pairs, expected/hard bands, sources
  strengthBalance.ts      // window anchor, per-movement strength, history,
                          // severity tiers, dedup + pickTopFindings, BAND_EPS
  strengthBalanceCopy.ts  // framing (sentence units), copy segments, TL;DR,
                          // trend regression (recent-window, months), labels
frontend/components/dashboard/strengthBalance/
  StrengthBalanceCard.tsx // recharts card: band, line, dot, segment control
frontend/components/dashboard/hooks/
  useDashboardStrengthBalance.ts  // memoized, computationCache, dismissals filter
frontend/utils/storage/
  strengthBalanceDismissals.ts    // 90-day per-pair suppression store (UI pending)
```

Computation goes through `computationCache` keyed by `filterCacheKey`, the
same pattern as every other dashboard hook, with a 10-minute TTL.

---

## 8. Deliberate design decisions (and why)

- **Most-recent-5 + p75, not top-5 or max.** Current strength, robust to
  spikes and stale peaks. This is a behavioral change from the original
  top-5-by-value idea — recent-ness beats raw peaks.
- **Recent-window trend.** The chip answers "how have the last ~5 weeks
  been", not "what happened 3 months ago". Regression over endpoints, months
  over weeks.
- **Sentence units everywhere.** The chart, dot, and trend chip share one
  scale with the copy — see the cautionary tale in §5.
- **Stable y-axis.** The band and current value define the scale; spikes
  clip. "Balanced view" for people who train a lot.
- **3-week smoothing on the chart only.** Severity and trend never see the
  smoothed values; only the visual line is smoothed.
- **Laggard dedup.** Bench in six pairs would otherwise repeat three times.
- **The dismissal store exists but has no UI yet.** The plumbing
  (`dismissPair`, `useStrengthBalanceDismissals`) is wired into the hook so
  adding a "Not relevant" control later is a small change — until then the
  filter is a no-op.

---

## 9. What's next

1. Dismissal UI — "Not relevant" with a reason (sport-specific, already
   working on it, not relevant, data looks wrong), 90-day suppression.
2. Left/right asymmetry tracking — per-arm strength gaps are the concern
   athletes actually care about most.
3. Pull-up/chin-up pairs, once a bodyweight setting exists.
4. Gender-specific lateral-raise bands (StrengthLevel has ~0.15×BW female
   vs. ~0.20×BW male tables) — research shows OHP:bench is ~64% for both
   sexes, so only some pairs would need them.
5. Training-level-aware band widths (beginner/advanced compression), using
   the app's existing `TrainingLevel`.
