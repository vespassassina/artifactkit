# Sample prompts

Two things live here: prompts that show what the skill does, and the **trigger
eval set** used to measure whether the skill actually fires.

---

## 1. Prompts that should produce a good artifact

Copy one, change the specifics.

### Report from data you already have
> Take the attached CSV of regional sales and build me a quarterly review page.
> Lead with whether we should keep funding the Southern region. Flag anything
> that's a partial period.

### Report from a system query
> Pull my open opportunities from MSX for this quarter and turn them into a
> one-pager I can send to my manager. Show which ones are at risk and why.

### Dashboard
> Build me a dashboard of our Azure consumption by service for the last 12
> months. I want to filter by subscription and export whatever I'm looking at.

### Tracker
> Make me a kanban board for the wave 2 migration — seven workloads, four
> states, owners and effort. I want to drag cards and keep the changes.

### Wiki
> Turn these meeting notes into a browsable page with a table of contents,
> decisions separated from open questions, and a search box.

### Scorecard
> Build a supplier scorecard across delivery, quality, cost and responsiveness
> for these five vendors. Include the rubric — I'll be challenged on it.

### Deck
> Turn this analysis into a 10-slide deck I can present and export to PDF.
> One idea per slide, titles that state the finding.

### Retheming
> Rebuild that report in dark mode, denser, with a green accent.

### Explicitly offline / shareable
> I need a single HTML file I can email to someone outside the company. It has
> to work with no internet and must not contain any credentials.

---

## 2. Prompts that should NOT trigger the skill

Useful for calibration; these are the near-misses.

- "Write a Python script that reads a CSV and uploads each row to Postgres"
  — shares "CSV", different task
- "Fix the CSS on our marketing site's nav bar" — existing site, not an artifact
- "What's the difference between contribution margin and gross margin?"
- "Summarise this spreadsheet for me" *(chat answer, unless they ask to see it
  as a page)*
- "Set up a React project with Vite"
- "Review this pull request"

---

## 3. Trigger eval set

The documented failure mode is that agents **under-trigger** skills, because
every model believes it can already write an HTML dashboard. Measure it.

**Method:** run each query cold, 3× each, in a fresh context. Record whether the
skill was invoked. Pass threshold **0.5**. Split 60/40 train/validation, keep the
split fixed across iterations, and select the description by *validation* score —
the best description is often not the last one you wrote. Do not patch in
keywords from failed queries; that is overfitting. Find the general category the
failure represents.

### Should trigger (10)

| # | Query | Why it is a real test |
|---|---|---|
| T1 | "build me a dashboard of last quarter's numbers" | canonical |
| T2 | "can you make this into a page I can send to my manager" | never says HTML or dashboard |
| T3 | "I need a kanban for the migration, seven workloads" | artifact type named, not the tool |
| T4 | "turn this csv into something readable" | vague, output format implied only |
| T5 | "visualise the monthly trend for these five regions" | "visualise", no artifact noun |
| T6 | "my manager asked for a one-pager on supplier performance by friday" | personal context, no jargon |
| T7 | "make a scorecard for these vendors with the rubric included" | long-tail component |
| T8 | "can I get this as slides" | deck, minimal phrasing |
| T9 | "build a small tool to track our onboarding checklist" | "tool", not "artifact" |
| T10 | "I want to see which accounts are concentrated — chart it" | analysis framed as a chart |

### Should not trigger (10)

| # | Query | Trap |
|---|---|---|
| F1 | "write a python script that reads a csv and uploads rows to postgres" | shares "CSV" |
| F2 | "fix the nav bar css on our marketing site" | shares "CSS" |
| F3 | "what's the difference between contribution and gross margin" | shares domain |
| F4 | "set up a react project with vite" | shares "build" |
| F5 | "review this pull request" | unrelated |
| F6 | "explain how our kanban process works to a new joiner" | shares "kanban", wants prose |
| F7 | "why is this chart in excel showing the wrong total" | shares "chart", debugging |
| F8 | "summarise these meeting notes" | wants a chat answer |
| F9 | "write the release notes for v2.1" | document, not artifact |
| F10 | "what does this SQL query do" | unrelated |

F6 and F7 are the valuable ones: they share the vocabulary but not the task. A
description that fires on those is over-pushy and will annoy people.

---

## 4. Does the skill actually help?

Separate question from triggering, and the more important one. Anthropic's
guidance: *"if the agent already handles the entire task well without the skill,
the skill may not be adding value."*

Run paired subagents on the same prompt — one with the skill, one without — and
compare on:

| Dimension | With skill should win because |
|---|---|
| Works offline from `file://` | unguided output uses CDN links and ES modules |
| Sorted column is indicated | routinely omitted |
| CSV exports the filtered rows | unguided exports the raw dataset |
| Missing data shown, not invented | unguided fills cells to look complete |
| Partial periods excluded | unguided plots them and draws a false cliff |
| Charts have an accessible twin | almost never done |
| Prints without splitting exhibits | almost never done |
| No credentials in the file | unguided embeds whatever was in scope |
| Consistent across runs | the measured 58–67% → ~90% vocabulary agreement |

If the unguided run wins or ties on most of these, the skill is not earning its
context budget and should be cut back rather than defended.
