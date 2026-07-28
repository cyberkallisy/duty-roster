# Duty Roster — Haryana Police Duty Management UI (Naukri Chitha)

A self-contained, **static** police duty-allocation web app (PS Munshi / OASI workflow)
for Haryana Police. Built as a single `index.html` (inline CSS + JS), backed by
`localStorage` — **no server, no database required**.

## Features
- **Daily Roster** — fixed duties (Role) + OASI temp duties, double-duty conflict flags,
  date-aware roster (leave/absence hide/show by date), print duty chitha.
- **Absent Report** — mark / remark absences.
- **Transfer & Posting** — by name / by post, repatriation resets tag → Permanent.
- **Law & Order** — templates, blank duty, multi-select members, resolve.
- **Leave Entry** — CL / EL deduction.
- **Training & B1** — course register, B1 CRC / final list.
- **Personnel Master** — filters, add, CSV export.
- **Master Reports** — transfer flow + history search.
- **Dashboard** — live coverage gauge, alerts, posting tag mix.
- Role switch (Munshi / OASI), freeze roster, notifications, reset demo.

## Project layout
```
duty-roster/
├── index.html        # the app (self-contained)
├── public/           # static assets (reserved)
├── vercel.json       # Vercel static deploy config
├── package.json      # metadata + no-op build
├── .gitignore
└── README.md
```

## Local dev
Open `index.html` directly in a browser, or:
```bash
npm start      # serves the folder via `npx serve`
```

## Deploy (Vercel)
Git-connected to `github.com/cyberkallisy/duty-roster`. Push to `main` →
Vercel auto-deploys the static site. Production URL:
**https://duty-roster.vercel.app**

## Data
All state lives in the browser's `localStorage` under key `naukri_chitha_v1`.
Use the **↺ Reset demo** button in-app to restore the seed sample.
<!-- deployed 1785233447 -->
<!-- live deploy 1785234418 -->
