# cyflux x turn.one -Product Requirements Document & UX Blueprint
### Version 1.0 | Confidential -For Internal Stakeholder Review
**Prepared for:** Executive & Investor Stakeholder Meeting
**Date:** April 2026
**Status:** MVP Definition -Pre-Development

---

## Table of Contents

1. [Executive Summary & Vision](#1-executive-summary--vision)
2. [User Personas & Roles](#2-user-personas--roles)
3. [Core UX Flows](#3-core-ux-flows)
4. [UI/UX Design Principles](#4-uiux-design-principles)
5. [Next.js Architecture Overview](#5-nextjs-architecture-overview)
6. [The Cyflux Moat](#6-the-cyflux-moat)

---

## 1. Executive Summary & Vision

### 1.1 The Problem

Enterprise marketing teams, growth agencies, and B2B content operations are hemorrhaging capital on SEO content that fails to convert. The current landscape is bifurcated between two failing archetypes: generic AI writing tools that produce superficial, fact-light content with no strategic depth, and legacy SEO agencies that are slow, expensive, and largely irrelevant in the age of programmatic search.

The middle-of-funnel (MoFu) and bottom-of-funnel (BoFu) stages -where purchase intent is highest and revenue decisions are made -remain deeply underserved. Buyers at these stages require precision content: technically authoritative, fact-verified, and architecturally optimized for the specific ranking signals that matter in 2026. No current tool delivers this reliably at scale.

### 1.2 The Solution

**cyflux x turn.one** is a closed-loop, AI-native SEO content engine purpose-built for B2B enterprises. It is not a writing assistant. It is not a content calendar. It is a revenue infrastructure tool that systematically generates high-authority MoFu and BoFu pages -the pages that convert -through a sophisticated, multi-agent n8n backend pipeline that fact-checks, structures, and validates content before it ever reaches the user interface.

The product is opinionated by design. Every feature included and every feature deliberately excluded is a strategic decision in service of one outcome: reducing the time from keyword intent to published, ranking, revenue-generating content.

### 1.3 Vision Statement

> *"cyflux x turn.one makes enterprise-grade SEO content generation as systematic and reliable as running a financial report."*

### 1.4 Commercial Opportunity

- **Target Market:** Mid-market to enterprise B2B companies with active SEO programs, growth-stage SaaS companies, and performance-oriented digital agencies.
- **Pricing Model:** Seat-based SaaS with a tiered credit system for page generation. Enterprise contracts with SLA guarantees.
- **Primary Revenue Driver:** Annual contracts negotiated at the organizational level (Admin role), not the individual user.
- **Positioning:** Premium tier. cyflux x turn.one is not competing on price. It is competing on output quality, workflow trust, and time-to-publish velocity.

### 1.5 MVP Scope & Success Criteria

The MVP delivers a vertically sliced, fully functional product loop: from onboarding a brand through to publishing a shareable, stakeholder-reviewed SEO page. The following north-star metrics define MVP success at 90 days post-launch:

| Metric | Target |
|--------|--------|
| Time from signup to first generated page | < 8 minutes |
| Page generation completion rate (started → published) | > 78% |
| NPS Score (Editor role) | > 52 |
| Average pages generated per workspace per month | > 14 |
| Stakeholder link open rate | > 60% |

---

## 2. User Personas & Roles

### 2.1 Role Architecture

cyflux x turn.one implements a three-tier Role-Based Access Control (RBAC) model. Roles are assigned at the workspace level by an Admin and govern the complete surface area of the application. Role inheritance is not supported -each role is a discrete permission set.

---

### Role 1: Admin

**Business Context:** The Admin is the economic buyer. They negotiated the contract, they own the budget, and they are accountable for content ROI. They interact with cyflux x turn.one at a strategic and operational level. They are not generating pages daily; they are governing the system.

**Core Permissions:**

- Full access to Billing & Subscription management (plan upgrades, credit top-ups, invoice history)
- User management: invite, remove, and reassign roles for all workspace members
- Workspace settings: brand profile configuration, API key management, n8n webhook configuration
- Access to all pages, drafts, and activity logs across all users within the workspace
- Ability to set workspace-level generation defaults (default tone, depth, target market)
- Export and audit logs for compliance purposes

**What Admins do NOT see:** Generation-level UI complexity (sliders, structure adjustment). Admins see outcomes and governance surfaces, not the creative workspace.

---

### Role 2: Editor

**Business Context:** The Editor is the primary user and the person whose daily workflow cyflux x turn.one must respect and accelerate. They are professionals with high standards. They have used inferior tools and are acutely sensitive to outputs that feel generic or structurally weak. The Editor persona is skeptical by default; cyflux x turn.one must earn their trust through output quality on the first generation.

**Core Permissions:**

- Full access to the Generation Workspace: initiate, configure, and manage page generation
- Structure adjustment via the pre-generation configuration panel (length, depth, angle sliders)
- Edit generated content in the inline editor post-generation
- Publish pages to the shareable link environment
- Invite Reviewers to specific pages via shareable link
- View dashboard KPIs and their own generation history
- Save and manage brand context templates

**What Editors do NOT see:** Billing, user management, or workspace-level configuration. Their interface is deliberately narrowed to the work itself.

---

### Role 3: Reviewer

**Business Context:** The Reviewer is typically external to the core workflow and is not a cyflux x turn.one seat holder. They access the platform exclusively via a shareable link generated by an Editor. The Reviewer experience must be frictionless -no account creation, no login complexity. Their entire relationship with cyflux x turn.one is through a single, polished review interface.

**Core Permissions:**

- View-only access to the specific page they were linked to
- Inline commenting on any section of the generated page
- Comment resolution acknowledgement (mark a comment as "Addressed" without editing)
- Formal approval action: a single, prominent "Approve for Publishing" action that notifies the Editor
- No access to the core application, dashboard, or any other page

**Critical UX Note:** The Reviewer interface must feel as premium and intentional as the core product. A client receiving a review link from an Editor is experiencing a cyflux x turn.one brand touchpoint. The review environment must reinforce the perception of enterprise quality, not expose the scaffolding of a SaaS product.

---

### 2.2 RBAC Matrix

| Feature / Surface | Admin | Editor | Reviewer |
|---|:---:|:---:|:---:|
| Billing & Subscription | ✓ | -| -|
| User Management | ✓ | -| -|
| Workspace Settings | ✓ | -| -|
| Dashboard KPIs | ✓ | ✓ | -|
| Generation Workspace | ✓ | ✓ | -|
| Structure Adjustment | ✓ | ✓ | -|
| Post-Generation Edit | ✓ | ✓ | -|
| Shareable Link Generation | ✓ | ✓ | -|
| View Shared Page | -| -| ✓ |
| Inline Commenting | -| -| ✓ |
| Approve for Publishing | -| -| ✓ |
| Activity Audit Log | ✓ | -| -|

---

## 3. Core UX Flows

### 3.1 Design Philosophy Preamble

Every flow in cyflux x turn.one is governed by a single principle: **the user should always know exactly where they are, what the system is doing, and what their one next action is.** Ambiguity is a trust deficit. The UX eliminates ambiguity at every step.

---

### 3.2 Flow 1: Onboarding -Brand Profile Setup

**Trigger:** User completes account creation and lands on the product for the first time.

**Objective:** Capture sufficient brand context to enable high-quality, on-brand generation without overwhelming the user or requiring them to re-enter information on every session.

**Design Principle:** A progress-tracked, multi-step wizard rendered inside a centred modal overlay on a dark, distraction-free background. No navigation. No sidebar. Just the wizard.

**Step Sequence:**

**Step 1 of 4 -Workspace Identity**
- Company name (required)
- Primary domain (required, with instant validation)
- Industry vertical (dropdown, curated list of 22 B2B verticals)
- Brief company description (2–3 sentence field with a live character count; this feeds directly into the generation system prompt)

**Step 2 of 4 -Target Audience**
- Primary buyer persona title (e.g., "VP of Engineering", "Head of Procurement")
- Geographic market focus (global / North America / EMEA / APAC / specific country)
- Company size of target accounts (SMB / Mid-Market / Enterprise -multi-select)
- Pain point summary: a short free-text field ("What problem do your best customers hire you to solve?")

**Step 3 of 4 -Brand Voice**
- Tone selector: a visual card-based selector with four clearly labelled, mutually exclusive options: **Authoritative**, **Consultative**, **Technical**, **Conversational**. Each card includes a one-sentence example of that tone applied to a B2B context.
- Competitor URLs (optional, up to 3): these are passed to the backend for differentiation analysis
- Topics or keywords to avoid (optional blocklist field)

**Step 4 of 4 -Confirmation & First Action Prompt**
- Summary card showing the entered brand profile (compact, read-only)
- Prominent primary CTA: **"Generate Your First Page →"**
- Secondary link: "Review settings later" to dismiss into the Dashboard

**Onboarding UX Rules:**
- Each step validates inline before progression. Users cannot proceed with invalid fields.
- Back navigation is always available; data entered in previous steps is preserved.
- The wizard auto-saves to draft on every field change. If the user closes the browser mid-onboarding, they resume exactly where they left off.
- The wizard does not expire or time out.
- Total estimated completion time displayed at the top of the wizard: "~4 minutes". This sets a concrete expectation.

---

### 3.3 Flow 2: The Dashboard

**Trigger:** User completes onboarding or logs into an established workspace.

**Objective:** Provide an immediate, unambiguous snapshot of workspace performance and direct access to the next generation action.

**Layout Architecture:**

The Dashboard uses a single-column, vertically stacked layout with a persistent left sidebar for navigation. The layout breathes. Generous whitespace is a feature, not an oversight.

**Section 1 -KPI Row (Top of Page)**

Three metric cards displayed in a horizontal row. Each card is minimal: a metric label, a large typographic number, and a secondary line showing a trend delta vs. the previous period (e.g., "+12% vs. last month" in a muted positive green, or "−4%" in a muted negative state -never aggressive red).

| Card | Metric | Data Source |
|------|--------|-------------|
| Pages Generated | Count of completed pages this calendar month | Internal DB |
| Estimated Monthly Traffic | Projected organic sessions from published pages | Keyword data × estimated CTR model |
| Domain Authority | Current DA score for the primary workspace domain | Third-party API (Moz or similar) |

**Section 2 -Recent Pages Feed**

A table or card list of the 8 most recently generated pages, showing: page title, target keyword, generated date, status (Draft / Published / Awaiting Review), and a quick-access "Open" action. No pagination on the Dashboard -users who need full history use the Pages library.

**Section 3 -Primary Action**

A persistent, visually weighted CTA block below the KPI row: **"Generate New Page"** -the single most important action in the entire application, and the Dashboard ensures it is the most obvious element on screen.

**Dashboard UX Rules:**
- No decorative charts unless they carry actionable insight. Vanity visualizations are explicitly excluded.
- KPI cards update on a 24-hour refresh cycle, with the last-updated timestamp displayed in a muted caption below the row.
- Empty states (a new workspace with no pages) show a focused prompt to generate the first page, not a tutorial carousel or feature announcement.

---

### 3.4 Flow 3: The Generation Workspace

This is the core revenue-delivering flow. Every UX decision in this flow is subject to the highest level of scrutiny.

**3.4.1 Entry Point: Pre-Generation Configuration**

**Trigger:** User clicks "Generate New Page" from the Dashboard or the persistent nav action.

**Interface:** A full-screen overlay or dedicated route -`/workspace/new`. The page is clean: a light background, centred content column, no distractions.

**Configuration Fields:**

- **Primary Target Keyword** (required): A single text input. cyflux x turn.one does not generate for multiple keywords simultaneously in the MVP. One keyword. One page. Maximum focus.
- **Page Intent** (required): Segmented control with two options -**MoFu** (Comparison, How-To, Educational) or **BoFu** (Solution-Specific, ROI-Focused, Conversion-Oriented). A brief, plainspoken tooltip defines each option for users who may be unfamiliar with funnel stage terminology.
- **Structure Controls** -displayed as a set of labelled sliders with discrete steps:
  - **Content Length:** Short (~1,200 words) → Standard (~2,200 words) → Comprehensive (~3,800 words). The slider snaps to three positions with a label that updates live.
  - **Technical Depth:** General Audience → Industry Practitioner → Technical Expert. Three discrete steps.
  - **Evidence Weighting:** A toggle-style control (not a slider) for "Include Data & Statistics" -on by default, with a brief note that enabling this activates the fact-checking layer in the backend pipeline.
- **Working Title or H1 Suggestion** (optional): A free-text field. If left blank, the system generates a title. If populated, the system uses it as a primary signal.

**Confirmation Action:**

A single, unambiguous button: **"Begin Generation →"**

Below the button, a one-line status note: *"Estimated generation time: 45–90 seconds"*. This sets expectation and eliminates premature anxiety.

**3.4.2 The Generation Experience -Active Processing UI**

This is a defining product moment. The generation experience must communicate intelligence, activity, and precision -not a black-box loading state.

**Layout:** The pre-generation configuration panel fades out (200ms ease transition). The workspace transitions to a single-focus view: a vertically scrollable content area where the page content appears in real time.

**The Typewriter/Thinking Animation:**

The content does not appear all at once. It streams line by line, section by section, mimicking the experience of watching an expert write in real time. The implementation follows these specific UX rules:

- Text renders character-by-character at a rate that feels deliberate but not slow (~35ms per character for body text; section headings render slightly faster at ~20ms)
- A single blinking cursor (`|`) follows the active generation point
- As each section completes, a subtle section-divider line appears below it before the next section begins generating -this creates a sense of structured progress, not chaotic streaming
- A fixed progress indicator in the top-right corner of the workspace shows: current section name and a fraction (e.g., "Section 3 of 7: Competitive Landscape")
- If the backend pipeline is running a fact-checking pass, a brief status line appears at the top of the workspace in a muted, monospaced font: *"Verifying claims and citations..."* -this communicates that the system is doing sophisticated work, not just autocompleting text

**What does NOT appear during generation:**
- No spinning loaders
- No generic "AI is thinking..." copy
- No percentage bars with arbitrary progress increments
- No interruption modals or "Did you know?" popups

**Interruption Handling:** If the user navigates away mid-generation, generation continues in the backend. Upon returning to the workspace, the page is fully generated and waiting. A toast notification is displayed: *"Your page is ready."*

**3.4.3 Post-Generation -The Workspace Editor**

Once generation is complete, the content is presented in a clean reading environment. The cursor animation stops. The progress indicator is replaced by a completion badge: *"Generation complete -2,340 words"*.

**Editor Layout:**

- **Left Panel (70% width):** The generated content in an inline editor (rich text, minimal toolbar -Bold, Italic, Heading levels, Link, and an "AI Regenerate Section" option accessible via a hover affordance on each section heading). No full markdown editor. No raw HTML view.
- **Right Panel (30% width):** A collapsible metadata and SEO analysis panel showing: generated title tag, meta description, estimated word count, keyword density for the primary keyword, and a list of secondary keywords detected in the content. This panel is informational; no actions are required.

**Primary Actions (Persistent Footer Bar):**
- **"Save Draft"** -saves the current state without publishing (autosave also runs every 60 seconds)
- **"Share for Review →"** -triggers the shareable link generation flow (see Section 3.5)
- **"Publish"** -marks the page as Published in the workspace library (does not push to any CMS in MVP; that is a post-MVP integration)

---

### 3.5 Flow 4: Collaboration -Shareable Review Links

**Trigger:** Editor clicks "Share for Review →" from the Post-Generation Workspace.

**Step 1 -Link Generation Modal**

A compact modal appears with:
- A generated URL (read-only, copy-to-clipboard button adjacent)
- Optional: "Add a message to reviewers" -a short text field whose content is displayed at the top of the review page, providing context (e.g., "Please review the competitive positioning section and approve by EOD Friday.")
- An expiry toggle: link does not expire (default) or expires in 7 days
- **"Copy Link & Close"** -the primary action

**Step 2 -The Reviewer Experience**

The Reviewer opens the link in any browser with no authentication requirement.

**Layout:**
- A clean, minimal document view of the generated page
- cyflux x turn.one branding is present but restrained -a small wordmark in the header. This is a client-facing surface; the focus is the content, not the product.
- The Editor's optional message appears at the top in a lightly styled callout block

**Inline Commenting Mechanism:**
- Reviewers highlight any text (word, sentence, or paragraph) to trigger a comment popover
- The popover contains a text input and a **"Post Comment"** button
- Posted comments are anchored to their text selection and displayed as a numbered marker in the document margin
- A comments sidebar (right panel) lists all comments chronologically, showing the commenter's identifier (name, if they provide it via a lightweight prompt on first comment -no account creation required), the selected text, and the comment text
- Comments are visible to the Editor in real time (or on next page load) in their Workspace view of the same page

**Approval Action:**
- A fixed, persistent banner at the top of the Reviewer experience (not intrusive -slim, ~48px height) contains: the page title, the total comment count, and a single action button: **"Approve for Publishing"**
- Clicking this button triggers a one-step confirmation modal: *"By approving, you confirm this content is ready for publishing. This cannot be undone."* with Confirm and Cancel buttons.
- Upon confirmation, a notification is dispatched to the Editor (in-app notification + email). The page status in the workspace updates to "Approved."

---

## 4. UI/UX Design Principles

*The following constitutes the binding design specification for all frontend implementation decisions. Any departure from these principles requires explicit sign-off.*

### 4.1 The Aesthetic Standard: Controlled Minimalism

cyflux x turn.one occupies the visual register of enterprise software that does not need to prove itself. The reference aesthetic is closer to Linear, Vercel's dashboard, and Stripe's documentation than it is to HubSpot, Semrush, or any consumer-facing SaaS. The product is confident. It does not use colour to excite. It uses space to command.

Every visual decision must survive the following test: *"Does this element earn its presence on screen?"* If a designer cannot articulate precisely why a component, colour, or typographic variation exists, it does not belong in the interface.

### 4.2 Colour System

**Base Palette (Tailwind Custom Config):**

| Token | Value | Application |
|-------|-------|-------------|
| `background` | `#09090B` (Zinc 950) | Primary application background |
| `surface` | `#18181B` (Zinc 900) | Card backgrounds, panels, modals |
| `surface-raised` | `#27272A` (Zinc 800) | Hover states, secondary panels |
| `border` | `#3F3F46` (Zinc 700) | All dividers, card borders, input borders |
| `text-primary` | `#FAFAFA` (Zinc 50) | Headings, primary body text |
| `text-secondary` | `#A1A1AA` (Zinc 400) | Captions, metadata, placeholder text |
| `text-muted` | `#52525B` (Zinc 600) | Disabled states, timestamps |
| `accent` | `#6366F1` (Indigo 500) | Primary CTAs, active states, focus rings |
| `accent-hover` | `#4F46E5` (Indigo 600) | Hover on primary CTAs |
| `success` | `#22C55E` (Green 500) | Positive deltas, approval states |
| `warning` | `#F59E0B` (Amber 500) | Expiring links, caution states |
| `destructive` | `#EF4444` (Red 500) | Irreversible action confirmation only |

**Governing Rule:** Accent colour (`#6366F1`) is used exclusively for interactive elements that require a primary action. It is never used decoratively. The palette is dark-mode first; no light mode in MVP.

### 4.3 Typography

**Font Stack:**
- **Primary:** `Geist` (Vercel's Geist Sans -variable font). Import via `next/font/local` or CDN.
- **Monospace:** `Geist Mono` -used exclusively for the generation animation, code snippets, and metadata values (keyword counts, word counts, API keys).

**Type Scale (Tailwind Mapping):**

| Role | Size | Weight | Tailwind Class |
|------|------|--------|----------------|
| Page Title | 30px | 600 | `text-3xl font-semibold` |
| Section Heading | 20px | 600 | `text-xl font-semibold` |
| Card Heading | 16px | 500 | `text-base font-medium` |
| Body | 14px | 400 | `text-sm font-normal` |
| Caption / Meta | 12px | 400 | `text-xs font-normal` |
| KPI Number | 36px | 700 | `text-4xl font-bold` |

**Line Height:** `leading-relaxed` (1.625) for all body text. Generous line height is non-negotiable for reading-intensive interfaces.

**Letter Spacing:** Tight on headings (`tracking-tight`). Default on body. Never expanded -expanded tracking communicates consumer branding, not enterprise precision.

### 4.4 Component Standards (Shadcn/UI Implementation)

cyflux x turn.one uses Shadcn/UI as its component foundation. All Shadcn components are themed to the cyflux colour system by modifying the `globals.css` CSS variable layer. No Shadcn component is used in its default (light) state.

**Component-Specific Rules:**

**Buttons:**
- Primary: filled `accent` background, `text-primary` label, `rounded-md` (6px), `px-4 py-2`. No gradients. No shadows. The button communicates authority through restraint.
- Secondary: `border border-border bg-transparent` with `text-primary`. Used for non-critical actions in the same interface area as a primary button.
- Destructive: only appears in confirmation modals for irreversible actions. Uses `destructive` background.
- Ghost: used for tertiary navigation actions within panels. `text-secondary` default, `text-primary` on hover.
- **Icons in buttons:** Use Lucide React icons at `size={16}`. Icons appear to the right of button labels for action buttons (→ direction), to the left for state indicators.

**Cards:**
- Background: `surface` (`#18181B`)
- Border: `1px solid border` (`#3F3F46`)
- Border radius: `rounded-lg` (8px)
- Padding: `p-5` or `p-6`
- No box shadows on cards. Depth is communicated through background differentiation (surface vs. background), not elevation shadows.

**Inputs:**
- Background: `background` (`#09090B`) -inputs recede into the background, focus pulls them forward
- Border: `border-border`, transitions to `border-accent` on focus
- Focus ring: `ring-2 ring-accent/20` -a subtle, low-opacity glow, not a hard ring
- Placeholder text: `text-muted`
- Error state: `border-destructive` with an inline error message below the field in `text-destructive text-xs`

**Sliders (Generation Configuration):**
- Use Shadcn's `Slider` component, restyled: track in `surface-raised`, filled portion in `accent`, thumb in `text-primary` with `border-2 border-accent`
- Labels: displayed above the slider in `text-sm text-secondary`, with the current value displayed prominently to the right in `text-sm text-primary font-medium`
- The slider should have a satisfying, snap-to-step interaction with a subtle haptic feel communicated through transition easing: `transition-all duration-100 ease-out`

**Modals:**
- Overlay: `bg-black/60 backdrop-blur-sm`
- Modal panel: `bg-surface border border-border rounded-xl`
- Maximum width: `max-w-md` for confirmations, `max-w-lg` for link generation, `max-w-2xl` for the onboarding wizard
- Dismiss: always available via an `×` icon button in the top-right corner of the panel, plus `Escape` key

**Toasts / Notifications:**
- Delivered via Shadcn `Sonner` integration
- Positioned: bottom-right
- Duration: 4 seconds for informational toasts, persistent (with dismiss) for action-required notifications
- Style: `bg-surface border border-border` with icon and message. No colour-coding on the toast container itself -only the icon (Lucide) carries the semantic state colour.

### 4.5 Motion & Animation

**Governing Rule:** Motion communicates state, not personality. Every animation must explain something to the user about what the interface is doing.

| Context | Animation Spec |
|---------|---------------|
| Page transitions | `opacity-0 → opacity-100`, 150ms, `ease-out` |
| Modal entrance | `scale-95 opacity-0 → scale-100 opacity-100`, 200ms, `ease-out` |
| Toast entrance | `translateY(8px) opacity-0 → translateY(0) opacity-100`, 200ms |
| Generation cursor | `opacity: 1 → 0`, 500ms, `ease-in-out`, `infinite` |
| Slider value update | `transition-all duration-100 ease-out` |
| Hover on interactive elements | `transition-colors duration-150` |

**Prohibited Animations:**
- No parallax effects
- No scroll-triggered animations or reveals
- No celebration animations (confetti, etc.) -the product earns trust through consistency, not theatrics
- No loading skeleton screens with gradient shimmer for content that loads in under 500ms

### 4.6 Spacing System

Strict adherence to Tailwind's default 4px base grid. All spacing values must be multiples of 4px. The primary content column has a maximum width of `max-w-5xl` (1024px) centred on screen. The dashboard sidebar is fixed at `w-56` (224px).

### 4.7 States: Empty, Loading, Error

Every data-bound surface must have explicitly designed states for all three conditions. Generic spinners and default browser error states are not acceptable.

**Empty State Design:**
- Centred, icon (Lucide, `size={40}`, `text-muted`), short heading in `text-base font-medium text-secondary`, and a brief one-sentence prompt in `text-sm text-muted`
- A single CTA button to initiate the action that populates the empty state
- No stock illustrations or decorative imagery in empty states

**Loading State:**
- For data fetches expected to complete in <1s: no loading indicator (prevents flash of loading state)
- For 1–3s: a simple `animate-pulse` placeholder using `bg-surface-raised rounded` blocks that mirror the layout of the loaded content
- For >3s (e.g., the generation pipeline): the full generation animation as described in Section 3.4.2

**Error State:**
- Inline form validation errors: immediate, field-level, in `text-destructive text-xs` below the relevant input
- API errors (failed generation, connection loss): a non-modal error callout within the workspace with a clear description of what failed and a single retry action. Error messages are written in plain language. They do not expose error codes or stack traces to end users.

---

## 5. Next.js Architecture Overview

### 5.1 Technology Decisions

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 15 (App Router) | RSC for performance, native streaming for generation UX |
| Language | TypeScript (strict mode) | Non-negotiable for enterprise codebase integrity |
| Styling | Tailwind CSS v4 + Shadcn/UI | Design system velocity without sacrificing control |
| Auth | Clerk | RBAC-native, enterprise SSO-ready, eliminates auth infrastructure |
| Database | Supabase (PostgreSQL) | Row-level security maps cleanly to RBAC model |
| ORM | Prisma | Type-safe schema with migration versioning |
| Backend Pipeline | n8n (self-hosted) | Multi-agent orchestration with webhook-based triggers |
| AI Streaming | Vercel AI SDK + SSE | Native support for streaming generation to the frontend |
| State Management | Zustand | Lightweight, no boilerplate, sufficient for workspace state |
| Real-time (Comments) | Supabase Realtime | WebSocket-based comment sync without additional infrastructure |
| Deployment | Vercel | Edge-optimised, zero-config Next.js deployment |
| Error Monitoring | Sentry | Enterprise error tracking with release tracking |

### 5.2 Application Directory Structure

```
cyflux/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (app)/
│   │   ├── layout.tsx              # App shell: sidebar + main content area
│   │   ├── dashboard/
│   │   │   └── page.tsx            # KPI overview + recent pages
│   │   ├── workspace/
│   │   │   ├── new/
│   │   │   │   └── page.tsx        # Pre-generation configuration
│   │   │   └── [pageId]/
│   │   │       └── page.tsx        # Post-generation editor
│   │   ├── pages/
│   │   │   └── page.tsx            # Full pages library
│   │   └── settings/
│   │       ├── workspace/          # Admin: brand profile, API keys
│   │       ├── team/               # Admin: user management
│   │       └── billing/            # Admin: subscription, credits
│   ├── review/
│   │   └── [token]/
│   │       └── page.tsx            # Public-facing Reviewer experience (no auth)
│   └── api/
│       ├── generate/
│       │   └── route.ts            # Triggers n8n webhook, streams response
│       ├── pages/
│       │   └── route.ts            # CRUD for generated pages
│       ├── share/
│       │   └── route.ts            # Shareable link token generation
│       └── webhooks/
│           └── n8n/
│               └── route.ts        # Receives completion callbacks from n8n
├── components/
│   ├── ui/                         # Shadcn base components (do not modify)
│   ├── dashboard/
│   │   ├── KPICard.tsx
│   │   ├── RecentPagesTable.tsx
│   │   └── DashboardShell.tsx
│   ├── workspace/
│   │   ├── GenerationConfig.tsx    # Pre-generation form + sliders
│   │   ├── GenerationStream.tsx    # Typewriter animation component
│   │   ├── WorkspaceEditor.tsx     # Post-generation inline editor
│   │   └── SEOMetaPanel.tsx        # Right-panel SEO metadata display
│   ├── review/
│   │   ├── ReviewDocument.tsx      # Read-only document view
│   │   ├── CommentSidebar.tsx      # Comment list panel
│   │   └── InlineComment.tsx       # Text selection → comment popover
│   ├── onboarding/
│   │   └── OnboardingWizard.tsx    # Multi-step onboarding modal
│   └── shared/
│       ├── AppSidebar.tsx
│       ├── TopBar.tsx
│       └── ShareModal.tsx
├── lib/
│   ├── auth.ts                     # Clerk helpers + role resolution
│   ├── db.ts                       # Prisma client singleton
│   ├── n8n.ts                      # n8n webhook trigger functions
│   └── utils.ts                    # Shared utility functions
├── hooks/
│   ├── useGenerationStream.ts      # SSE hook for generation streaming
│   ├── useWorkspace.ts             # Workspace state via Zustand
│   └── useComments.ts              # Supabase Realtime comment subscription
├── types/
│   ├── page.ts                     # Page entity types
│   ├── user.ts                     # User + role types
│   └── n8n.ts                      # n8n payload types
├── prisma/
│   └── schema.prisma
└── middleware.ts                   # Clerk auth + role-based route protection
```

### 5.3 Critical Technical Implementation Notes

**Generation Streaming Architecture:**

The generation experience (Section 3.4.2) is not a mock animation applied to pre-fetched content. It is genuine streaming from the n8n backend pipeline via Server-Sent Events (SSE). The `/api/generate` route opens an SSE connection to the n8n workflow, which emits content tokens as the multi-agent pipeline produces them. The `useGenerationStream` hook on the client subscribes to this stream and updates the `GenerationStream` component state with each incoming chunk. This creates authentic, real-time generation with no artificial delays.

**RBAC Enforcement:**

Roles are enforced at three layers: (1) Clerk `publicMetadata.role` on the session token, (2) Next.js middleware route protection using the resolved role, and (3) Supabase Row Level Security policies on the database. No client-side role check is considered authoritative -the middleware and RLS layers are the security boundary.

**Reviewer Route (Public, No Auth):**

The `/review/[token]` route is explicitly excluded from the Clerk middleware matcher. Shareable link tokens are generated as cryptographically secure, unguessable UUIDs stored in the database with an optional expiry. The token is resolved on the server, and the page is rendered as a Server Component with the page content -no client-side data fetching occurs, eliminating the risk of token exposure in network requests.

**Autosave Implementation:**

The workspace editor uses a debounced autosave pattern: content changes are written to a local Zustand store immediately (zero-latency UI feedback), and a debounced API call (`delay: 60000ms`) persists the draft to Supabase. The save status is reflected in the persistent footer bar: "Saving..." → "Saved" → "All changes saved."

---

## 6. The Cyflux Moat

*This section defines cyflux x turn.one's strategic position. It is both a product principle and a sales narrative.*

### 6.1 What cyflux x turn.one Does -The Core Moat

The competitive moat for cyflux x turn.one is not a single feature. It is the combination of what the system produces and the trust the UX creates in that output.

**Moat Pillar 1: MoFu/BoFu Specificity**

Generic AI writing tools are trained to produce content. cyflux x turn.one is trained to produce content that converts at specific funnel stages. The n8n backend pipeline is a multi-agent system with discrete, specialised agents for intent analysis, competitive gap identification, claim validation, and structural optimisation for the target funnel stage. The output is not a well-written article. It is a strategically engineered revenue asset.

**Moat Pillar 2: Fact-Checked Output**

Every claim, statistic, and citation in a cyflux x turn.one-generated page passes through a verification agent before reaching the user. This is not a disclaimer or a marketing claim -it is a step in the workflow that is communicated transparently to the user during generation (*"Verifying claims and citations..."*). In a market saturated with hallucinated AI content, verifiable accuracy is a category-defining differentiator.

**Moat Pillar 3: Trust-First UX**

The generation streaming experience -seeing the system work in real time -builds user trust in a way that no static loading screen can. Users do not feel they are receiving output from a black box. They watch the system think. This perceived transparency is a purchasing-decision differentiator in enterprise sales contexts where procurement teams scrutinise vendor trustworthiness.

**Moat Pillar 4: Workflow Linearity**

The cyflux x turn.one workflow is deliberately linear and non-branching in the MVP. Users cannot take a wrong turn. Every screen has one primary action. This is not a constraint of the MVP -it is a deliberate product philosophy. Workflow complexity is a hidden cost that enterprise buyers eventually quantify. cyflux x turn.one's simplicity is the product.

**Moat Pillar 5: The Review Loop**

The shareable link review experience with inline commenting creates a closed-loop content approval workflow that eliminates email chains, PDF markups, and shared Google Doc confusion. For agency users, this is a client management feature as much as a content feature.

---

### 6.2 What cyflux x turn.one Intentionally Excludes -The Strategic Exclusions

*These exclusions are not limitations. They are product decisions. Each one has been made deliberately to protect the core UX and prevent the feature bloat that has made incumbent tools frustrating to use.*

| Excluded Feature | Why Competitors Have It | Why cyflux x turn.one Excludes It |
|---|---|---|
| Keyword research tools | Semrush, Ahrefs, Surfer SEO bundle research because they started as research tools | Users bring their keyword strategy. cyflux x turn.one executes against it. Bundling research adds complexity without improving the generation outcome. |
| Content calendar & scheduling | HubSpot, Contentful want to own the entire content lifecycle | Lifecycle management is a distraction from the generation quality problem. Calendar tools commoditise the workflow; cyflux x turn.one differentiates on the output. |
| CMS integrations (MVP) | Every competitor integrates with WordPress, Webflow, etc. | Premature integration increases surface area for bugs and support debt. Post-generation publishing is a copy-paste action in the MVP; integration is a post-MVP revenue feature. |
| Multi-keyword batch generation | Volume-focused tools prioritise throughput | Volume is not the value proposition. One precision-engineered page is worth more than ten mediocre pages. Batch generation would incentivise the wrong user behaviour. |
| Social media repurposing | Jasper, Copy.ai pursue multi-channel content | cyflux x turn.one is an SEO tool. Repurposing content for LinkedIn or Twitter is a different problem domain. Pursuing it dilutes the product identity and the generation model's optimisation. |
| SERP rank tracking | Semrush, Ahrefs compete on rank-tracking dashboards | Real-time rank tracking requires significant infrastructure and creates a different product entirely. Estimated traffic is sufficient for MVP dashboard context. |
| A/B testing of generated content | Some enterprise tools offer content variant testing | AB testing in the content layer introduces workflow complexity that undermines the linear UX principle. Post-MVP consideration if demand is validated. |
| Paraphrasing / AI detection bypass | Several tools market "undetectable AI content" | cyflux x turn.one does not compete in the AI-detection evasion market. That market is adversarial, ethically compromised, and will erode with search engine evolution. cyflux x turn.one produces authoritative content that is worth reading -not content that is hiding what it is. |
| Team chat / internal messaging | Some tools add Slack-like features | In-product messaging is a product within a product. Reviewers use email and Slack; cyflux x turn.one connects to those workflows via notifications, not by replacing them. |
| Light mode | Most tools offer theme switching | Not an MVP consideration. Dark mode is the preferred working environment for the target persona and enforces the premium, focused aesthetic without maintaining two design systems. |

---

### 6.3 The Competitive Positioning Summary

| Dimension | Semrush / Ahrefs | Jasper / Copy.ai | Surfer SEO | **cyflux x turn.one** |
|-----------|-----------------|-----------------|------------|---------------|
| Primary Value | Research & Tracking | Volume Content | Optimised Articles | Revenue-Stage Pages |
| Funnel Focus | Top of Funnel | All | Broad | MoFu + BoFu Only |
| Fact Checking | None | None | None | **Pipeline-Verified** |
| UX Complexity | High | Medium | Medium | **Intentionally Low** |
| Target Buyer | SEO Managers | Marketers | SEOs | **Growth Leaders + Agencies** |
| Streaming UX | No | No | No | **Yes -Trust Signal** |
| Reviewer Collaboration | No | No | No | **Yes -Inline Comments** |
| Pricing Posture | Subscription | Subscription | Subscription | **Premium / Enterprise** |

---

### 6.4 The One-Line Pitch

> *"cyflux x turn.one generates the SEO pages that close deals -not the ones that fill word counts."*

---

## Appendix A: Open Questions for Stakeholder Review

The following items require executive alignment before development commences:

1. **Credit Model Economics:** What is the cost basis per page generation given the multi-agent n8n pipeline? This determines the credit pricing floor.
2. **Domain Authority Data Partner:** Which third-party API provider do we contract for DA data? (Moz, Semrush API, Ahrefs API). This affects the KPI dashboard data reliability.
3. **Fact-Checking Scope:** What constitutes a "verified claim"? Does the backend cite its sources publicly in the generated page, or does verification remain internal? This has implications for the trust narrative.
4. **Enterprise SSO Priority:** Is SAML/SSO support required at launch for any pipeline accounts? Clerk supports this at an additional tier.
5. **Content Ownership & Data Policy:** How does cyflux x turn.one handle generated content in relation to training data? Enterprise buyers will ask this during procurement.

---

## Appendix B: MVP Feature Delivery Prioritisation

| Priority | Feature | Complexity | Revenue Impact |
|----------|---------|-----------|----------------|
| P0 | Authentication & RBAC (Clerk) | Low | Critical |
| P0 | Onboarding Wizard | Medium | Critical |
| P0 | Generation Workspace + Streaming UX | High | Critical |
| P0 | Dashboard with KPI Cards | Medium | High |
| P1 | Shareable Review Links | Medium | High |
| P1 | Inline Commenting (Reviewer) | High | High |
| P1 | Post-Generation Inline Editor | Medium | High |
| P2 | Billing & Credits (Admin) | Medium | Critical (for revenue) |
| P2 | Team Management (Admin) | Low | High |
| P3 | Pages Library with Filter/Search | Low | Medium |
| P3 | Brand Profile Templates | Low | Medium |

---

*Document Classification: Confidential -Internal Use Only*
*Next Review: Pre-Sprint-1 Kickoff*
*Maintained by: Product & Engineering Leadership*

---
*cyflux x turn.one © 2026 -All rights reserved*
