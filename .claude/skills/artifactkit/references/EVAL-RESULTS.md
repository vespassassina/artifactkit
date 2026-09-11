# Trigger eval — results

**Run:** 11 Sep 2026 · 20 queries × 3 models (Claude Haiku 4.5, GPT-5.4 mini,
Gemini 3.5 Flash) = 60 judgements.

Varying the *model* rather than repeating on one is a stricter test: it measures
whether the description survives model variation, not just sampling noise.

Method: each model saw only the `name` + `description` of four competing skills
(artifactkit, pptx, xlsx, docx) — exactly what an agent sees at selection time —
and was told to answer "none" honestly if it would just do the task itself.

## Headline

| Metric | Result | Threshold |
|---|---|---|
| Trigger rate on positives | **0.90** | > 0.5 ✅ |
| False-fire rate on negatives | **0.00** | low ✅ |
| Missed positives | 3 of 30 | — |
| False fires | 0 of 30 | — |

**Unanimous across all three models on 19 of 20 queries.** The only disagreement
was Q19, where GPT routed release notes to `docx` and the others said "none" —
not an artifactkit question either way.

## The one systematic miss: Q8 "can I get this as slides"

All three models routed it to `pptx`. This is the only positive that failed, and
it failed identically everywhere.

**This is correct behaviour, not a description bug.** With no context, "slides"
most plausibly means PowerPoint, and `pptx` is the better answer. Users who want
an HTML deck say so ("a deck I can present in the browser", "slides I can email
as one file"), and those phrasings are already covered.

**Do not fix this by adding "slides" keywords.** That is overfitting to a single
failed query — the documented anti-pattern. It would also start stealing genuine
PowerPoint requests, which is a worse failure than missing an ambiguous one.

Action taken: none. Documented as expected.

## Negatives: all clean, including the deliberate traps

The two designed traps both held:

| Q | Query | Shares | Result |
|---|---|---|---|
| 16 | "explain how our kanban process works to a new joiner" | "kanban" | all 3 → none ✅ |
| 17 | "why is this chart in excel showing the wrong total" | "chart" | all 3 → xlsx ✅ |

Q17 going to `xlsx` rather than "none" is right — it *is* a spreadsheet question.
What matters is that it did not go to artifactkit.

Zero false fires across 30 negative judgements means the description is
assertive without being greedy. Given the guidance to be "pushy", over-firing was
the live risk, and it did not materialise.

## Notable passes

| Q | Query | Why it was a real test |
|---|---|---|
| 2 | "can you make this into a page I can send to my manager" | never says HTML, dashboard or report |
| 4 | "turn this csv into something readable" | output format only implied — and `xlsx` was available as a competing answer |
| 6 | "my manager asked for a one-pager on supplier performance by friday" | personal framing, no technical vocabulary |
| 9 | "build a small tool to track our onboarding checklist" | says "tool", not "artifact" |

Q4 is the most informative: all three chose artifactkit over `xlsx` despite the
message containing the literal word "csv", which means the "turn a CSV into
something readable" clause is doing real work.

## Caveats

1. **This measures selection, not execution.** It does not show the skill
   produces better artifacts — see §4 of `SAMPLE-PROMPTS.md` for the paired
   with-skill vs baseline comparison, which is still owed.
2. **Simulated selection.** Models were asked to *predict* their choice rather
   than being observed in a live harness with full tool access. Real selection
   also competes against the agent's own "I can just write this" instinct, which
   a simulation may under-represent — the bias runs toward optimism.
3. **Four competing skills.** A real installation may have dozens, and Codex
   truncates descriptions when many are installed. The load-bearing clauses are
   deliberately front-loaded for that reason.
4. **No train/validation split was needed** because no iteration occurred — the
   first description passed. If it is ever revised, split 60/40 and select on
   validation, per the documented method.

## Verdict

Ship the description unchanged. 0.90 trigger rate, zero false fires, unanimous
across three model families, with the single miss being the correct answer.
