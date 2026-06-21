---
name: seo-briefing
description: "Build clear Dutch SEO content briefings from rough client input. Use when the user has a keyword, topic, service, audience, client notes, website context, or messy request and needs a structured SEO brief before writing: search intent, reader situation, offer, proof, CTA, missing information, constraints, and writing direction."
---

# SEO-briefing

## Purpose

Turn loose client input into a practical SEO briefing that a writer or generation system can use. Keep it client-friendly: ask only what is missing, translate vague wishes into concrete page direction, and never expose internal prompt logic.

## Workflow

1. Identify the page job: informational article, service page, comparison page, local page, MoFu page, BoFu page, or landing page.
2. Extract known context: keyword/topic, company, offer, audience, location, proof, tone, CTA, competitors, constraints, and forbidden claims.
3. Decide search intent and buying stage.
4. Define the reader situation in plain Dutch: problem, doubt, risk, desired outcome, and reason to act now.
5. Ask at most 3 missing-context questions if the answer would materially improve the page.
6. Produce a structured briefing. If details are missing, make conservative assumptions and mark them as assumptions.

## When Input Is Thin

If the client only gives a topic, do not block. Ask no more than 3 questions, or proceed with careful assumptions when speed matters.

Good questions:

- Voor wie is deze pagina bedoeld?
- Wat moet de lezer na het lezen doen?
- Welk bewijs, voorbeeld of klantcontext mogen we gebruiken?

Avoid technical questions about schema, heading counts, keyword density, or prompt formats.

## Output Format

Return this structure:

```markdown
## SEO Briefing

**Onderwerp / zoekwoord:** ...
**Paginatype:** ...
**Zoekintentie:** ...
**Koopfase:** ...
**Primaire lezer:** ...
**Situatie van de lezer:** ...
**Aanbod / oplossing:** ...
**Belangrijkste belofte:** ...
**Bewijs en vertrouwen:** ...
**CTA:** ...

### Moet erin
- ...

### Vermijden
- ...

### Schrijfrichting
- ...

### Open vragen
- ...

### Aannames
- ...
```

## Standards

- Write in Dutch unless the user asks otherwise.
- Keep the briefing specific enough that `seo-structure` can create a page outline without guessing.
- Use concrete language: who, what, why now, what risk, what outcome.
- Do not invent proof, clients, statistics, certifications, awards, or guarantees.
- Do not repeat the user's rough prompt as the reader-facing page angle.
- Include constraints that protect quality: no generic AI phrases, no fake proof, no overclaiming.

## Handoff

After creating the briefing:

- Use `../seo-structure/SKILL.md` when a page outline, H1/H2 flow, FAQ, or content architecture is needed.
- Use `../seo-writer/SKILL.md` when the final long-form SEO page should be written.
