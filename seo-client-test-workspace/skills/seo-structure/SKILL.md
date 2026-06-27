---
name: seo-structure
description: Design SEO page structures before writing. Use when the user needs an H1/H2 outline, content architecture, page flow, FAQ plan, internal-link plan, title/meta direction, or wants to turn an SEO briefing into a writer-ready structure for Dutch B2B SEO pages, service pages, comparison pages, local pages, MoFu pages, or BoFu pages.
---

# SEO-structure

## Purpose

Create the page architecture that makes an SEO page useful before prose is written. The structure should guide search intent, buyer decision-making, proof, objections, and CTA.

## Workflow

1. Start from a briefing. If no briefing exists, create a compact one or use `../seo-briefing/SKILL.md`.
2. Confirm the page type and search intent.
3. Choose one dominant reader journey: understand, compare, trust, decide, or act.
4. Build exactly one H1 and 5-8 H2 sections for full SEO pages.
5. Add section notes that explain what each section must do.
6. Include FAQ only when real buyer questions or objections exist.
7. Add title and meta description separately from visible body structure.

## Structure Principles

- The first screen must answer: what is this, who is it for, why does it matter?
- Each H2 must earn its place. No decorative headings.
- Place proof before CTA when the page asks for trust.
- Place criteria before vendor/solution claims when the reader is comparing.
- Use FAQ for objections, timing, cost, suitability, process, and risk.
- Do not turn the briefing into visible copy. Convert it into reader-facing sections.

## Output Format

Return this structure:

```markdown
## SEO Structuur

**SEO title:** ...
**Meta description:** ...
**H1:** ...
**Paginaflow:** ...

### H2-structuur

1. **H2:** ...
   Doel: ...
   Inhoudspunten:
   - ...

2. **H2:** ...
   Doel: ...
   Inhoudspunten:
   - ...

### Praktische lijst
- Waar de lijst hoort: ...
- Items: ...

### FAQ
- Vraag: ...
  Antwoordrichting: ...

### CTA-sectie
- Plaatsing: ...
- Boodschap: ...
- Actie: ...

### Interne links
- Link naar: ...
  Ankertekst: ...
```

## Page Type Patterns

Read `references/page-patterns.md` when choosing a structure for a specific page type.
When the page is about woningontruiming, ontruimingsdienst, bedrijfsontruiming, spoedontruiming, or a local practical service page, also read `../seo-writer/references/ontruiming-local-seo.md` and turn its market patterns into an original structure.

## Quality Gate

Before finishing, check:

- Exactly one H1.
- 5-8 useful H2 sections for a full SEO page.
- The structure follows the search intent.
- The CTA follows from the argument.
- The structure gives `seo-writer` enough direction to write without inventing facts.
