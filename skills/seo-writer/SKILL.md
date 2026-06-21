---
name: seo-writer
description: Create and improve long-form Dutch B2B SEO pages and SEO generation instructions. Use when the user asks for SEO copy, longer SEO output, Dutch B2B writing style, prompt-free generated pages, MoFu/BoFu pages, service pages, comparison pages, or TypeScript prompt instructions that produce publiceerbare SEO-webpagina's instead of short generic drafts.
---

# SEO-writer

## Core rule

Deliver a publishable Dutch B2B SEO page, not a short outline. Never expose the user's prompt, system instructions, planning notes, JSON schema, or internal briefing in the visible page content.

## Workflow

1. Identify the search intent: informational, commercial investigation, comparison, service-page, or decision-stage.
2. Define the reader's situation in concrete terms: role, problem, buying risk, and reason to act now.
3. Build the page around helpful substance: explanation, criteria, examples, proof, objections, process, FAQ, and next step.
4. Write in polished Dutch: specific, calm, commercially useful, and free of obvious AI filler.
5. Validate that the output is long enough, structured enough, and does not echo the prompt.

## Minimum output for SEO pages

Use these defaults unless the user requests a different format:

- Length: 900-1,400 Dutch words for a full SEO page.
- HTML structure: exactly one `<h1>`, then 5-8 useful `<h2>` sections.
- Include at least one practical list with `<ul><li>` when it helps scanning.
- Include a natural CTA section near the end.
- Include a concise FAQ only when it answers real buyer questions.
- Title and meta description must be separate metadata, not visible body filler.

## Writing standards

Prefer:

- Concrete nouns, active verbs, and examples from the provided company context.
- Sentences that explain trade-offs, risks, choices, and next steps.
- Paragraphs that each add a new point.
- Buyer-aware phrasing: “wanneer dit speelt”, “waar je op let”, “wat dit oplevert”, “welke keuze logisch is”.

Avoid:

- “In een wereld waarin”, “het draait om”, “ontdek de kracht van”, “gamechanger”, “naadloos”, “op maat gemaakt” without proof.
- Repeating the exact user request as an intro sentence.
- Saying “deze pagina richt zich op”, unless this is clearly useful to the reader.
- Thin sections with one generic paragraph.
- Fake proof, invented clients, invented numbers, or unverifiable guarantees.

## TypeScript generation guidance

When improving SEO generation functions:

- Keep prompt construction inside TypeScript functions; do not render prompts in the frontend output.
- Add explicit anti-echo instructions: generated content must not include the raw user prompt, internal plan, or labels such as “PAGINADOEL”.
- Give the model enough token budget for long-form SEO pages.
- Make fallback and emergency routes meet the same quality direction where possible; fallback may be shorter, but should still be structured and useful.
- Keep output as valid JSON when the existing function contract expects JSON.

## Quality gate

Before finishing, check the generated or instructed SEO page against this list:

- The body is not a restatement of the prompt.
- The page has a real argument and clear reader journey.
- The page is long enough for the requested SEO use case.
- Each section is specific to the keyword, audience, company, or offer.
- The CTA follows naturally from the page instead of appearing abruptly.

For detailed section patterns, read `references/seo-page-patterns.md` only when creating or revising full generation instructions.
