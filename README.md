# Titrate Testing — deployment guide

This gets the site live, on a free `*.pages.dev` subdomain, with a working
COA lookup backed by a real database — at $0/month, no credit card required.

Stack: **Cloudflare Pages** (hosting + serverless functions) + **Cloudflare D1**
(free SQLite database). Everything lives in one Cloudflare account, so you're
only juggling one dashboard.

---

## What you already have

```
titrate-testing/
├── public/
│   └── index.html          ← the site itself
├── functions/
│   └── api/
│       ├── lookup.js        ← GET /api/lookup?batch=...
│       └── vendors.js       ← GET /api/vendors
├── schema.sql               ← database structure + demo data
├── wrangler.toml             ← only needed for local testing
└── README.md                ← this file
```

---

## Step 1 — Put the project on GitHub (free)

Cloudflare Pages deploys straight from a GitHub repo, which also gives you
automatic redeploys every time you push a change.

1. Create a free account at [github.com](https://github.com) if you don't have one.
2. Create a new **empty** repository called `titrate-testing` (public or private, either works).
3. On your own computer, open a terminal in the `titrate-testing` folder and run:

```bash
git init
git add .
git commit -m "Initial site"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/titrate-testing.git
git push -u origin main
```

(No `git` installed? GitHub also lets you drag-and-drop the folder contents
through the "Add file → Upload files" button in the repo, no terminal needed.)

---

## Step 2 — Create the database (D1)

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) and sign up free.
2. In the left sidebar: **Workers & Pages → D1**.
3. Click **Create database**, name it `titrate-testing-db`, create it.
4. Open the new database, go to its **Console** tab.
5. Open `schema.sql` from this project, copy the whole contents, paste into
   the console, and run it. This creates the `vendors` and `batches` tables
   and adds a few demo rows so the lookup tool works immediately.

---

## Step 3 — Create the Pages project

1. Still in the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**.
2. Authorize GitHub, pick the `titrate-testing` repo.
3. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave empty)*
   - **Build output directory:** `public`
4. Click **Save and Deploy**.

Cloudflare will build and publish the site at a free URL that looks like
`titrate-testing-xyz.pages.dev`. That's your live site — this step alone
gets the informational content published.

---

## Step 4 — Connect the database to the site

The lookup tool won't work yet — the site is deployed, but its functions
don't know the database exists until you bind them.

1. Open your new Pages project → **Settings → Functions**.
2. Scroll to **D1 database bindings → Add binding**.
3. **Variable name:** `DB` (must match exactly — this is what `lookup.js` and
   `vendors.js` refer to as `env.DB`).
4. **D1 database:** select `titrate-testing-db`.
5. Save, then go to the **Deployments** tab and **retry/redeploy** the latest
   deployment so the binding takes effect.

---

## Step 5 — Test it

Visit your `*.pages.dev` URL, scroll to the lookup tool, and try:

```
FDT-2026-04471
```

That's one of the demo rows from `schema.sql` — you should see a full
"Verified" result card. Try `UNK-2026-00019` to see what a flagged result
looks like.

---

## Replacing the demo data with real data

The demo rows in `schema.sql` are placeholders. To add real vendors and
batch results, go back to **D1 → your database → Console** and run `INSERT`
statements shaped like the ones at the bottom of `schema.sql`, e.g.:

```sql
INSERT INTO vendors (name, tier, website, notes)
VALUES ('Real Vendor Name', 'verified', 'https://realvendor.com', NULL);

INSERT INTO batches (batch_id, vendor_id, product, labeled_mg, measured_mg, purity_pct, test_lab, test_date, status, coa_url)
VALUES ('REAL-BATCH-ID', 1, 'MOTS-c', 10.0, 9.9, 99.0, 'Freedom Diagnostics Testing', '2026-08-01', 'pass', 'https://...');
```

(`vendor_id` is the numeric `id` of the row you just inserted into `vendors`
— check it in the D1 console's **Tables** tab if you're not sure.)

---

## Later, if you want a real domain

Everything above is $0/month forever on the `pages.dev` subdomain. If you
later want `titratetesting.com`:

1. Buy the domain anywhere (Cloudflare Registrar sells at-cost, ~$10–12/yr,
   no markup).
2. In your Pages project: **Custom domains → Set up a custom domain**, enter
   `titratetesting.com`, follow the DNS prompts. Cloudflare issues the SSL
   certificate automatically — no extra cost or setup.

Nothing about the site or database needs to change; you're just pointing a
new domain at the same free deployment.

---

## Local testing (optional, only if you want to preview before pushing)

Requires [Node.js](https://nodejs.org) installed.

```bash
npm install -g wrangler
wrangler d1 execute titrate-testing-db --local --file=./schema.sql
wrangler pages dev public
```

