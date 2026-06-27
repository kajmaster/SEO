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
5. If the input is thin, ask briefing questions first and stop. Do not produce a final page or full structure yet.
6. If the input is mostly complete, ask only the few missing-context questions that materially improve the page.
7. Produce a structured briefing. If details are missing after the client answers, make conservative assumptions and mark them as assumptions.

## When Input Is Thin

If the client only gives a topic, one sentence, or a vague service/product idea, do not write the page yet. Ask a short briefing intake first and wait for the answer.

Treat input as thin when it misses most of these:

- Company name
- Product or service details
- Audience
- Location or service area
- Differentiator
- Experience or background
- Proof or trust signals
- CTA
- Tone

Ask 6-8 simple questions. Use this default set unless the request clearly needs different questions:

```markdown
Voordat ik de pagina schrijf, heb ik eerst een korte briefing nodig. Beantwoord wat je weet; overslaan mag.

1. Wat is je bedrijfsnaam en in welke plaats/regio werk je?
2. Wat verkoop of lever je precies?
3. Voor wie is deze pagina bedoeld?
4. Waarom kiezen klanten voor jou in plaats van een alternatief?
5. Hoelang doe je dit al, of welke ervaring/specialisatie mogen we noemen?
6. Welk bewijs mogen we gebruiken, zoals reviews, voorbeelden, foto's, certificaten of garanties?
7. Wat moet de lezer na het lezen doen: bellen, mailen, offerte aanvragen, bestellen of iets anders?
8. Welke toon past bij je bedrijf: nuchter, luxe, informeel, zakelijk, lokaal, deskundig?
```

Good questions:

- Voor wie is deze pagina bedoeld?
- Wat moet de lezer na het lezen doen?
- Welk bewijs, voorbeeld of klantcontext mogen we gebruiken?
- Hoelang bestaat je bedrijf of hoelang doe je dit werk?
- Wat maakt je product of service anders dan alternatieven?

Avoid technical questions about schema, heading counts, keyword density, or prompt formats.

Only proceed with assumptions when the client explicitly asks to continue without answering more questions.

## Niche briefing: ontruiming

For woningontruiming, ontruimingsdienst, bedrijfsontruiming, zorgkamerontruiming, spoedontruiming, vervuilde woning, or local pages such as "woningontruiming Groningen", ask practical service questions before writing:

- Welke soorten ontruiming doen jullie precies?
- In welke plaatsen, wijken of provincies werken jullie?
- Kunnen jullie spoed aan, en binnen welke termijn?
- Leveren jullie bezemschoon op? Doen jullie ook schoonmaak, herstelwerk, vloeren, gordijnen, tuin, schuur of garage?
- Wat gebeurt er met bruikbare spullen?
- Hoe werkt de offerte: gratis, vrijblijvend, bezoek, foto's, telefoon, vaste vanafprijs of maatwerk?
- Welke trust-signalen mogen we noemen: ervaring, reviews, KVK, openingstijden, verzekeringen, foto's, lokale betrokkenheid?
- Wat is de gewenste actie: bellen, WhatsApp, offerte aanvragen, foto's sturen, afspraak plannen?

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
