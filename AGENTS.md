# SEO Workspace Agents

## GStack for Codex

This project can use repo-local GStack skills for Codex.

Setup:

```powershell
npm run gstack:setup
```

What that does:

- creates a local `.agents/skills/gstack` junction to your GStack checkout
- runs GStack's official Codex setup for this repo
- generates repo-local skill entries like `gstack-review`, `gstack-qa`, and `gstack-investigate`

Default source lookup order:

1. `$env:GSTACK_SOURCE`
2. `C:\Users\Kaj\Desktop\gstack\gstack-main`
3. `C:\Users\Kaj\gstack`
4. `C:\Users\Kaj\.codex\skills\gstack`

Important:

- `.agents/` is generated local machine state and is gitignored in this repo
- after running setup, restart Codex or open a new session so the new skills are picked up
- if you move your GStack checkout, run the setup command again

Recommended GStack skills for this project:

- `/gstack-investigate` for debugging
- `/gstack-review` for pre-merge review
- `/gstack-qa` for browser QA
- `/gstack-design-review` for frontend polish
- `/gstack-ship` when you are ready to publish
