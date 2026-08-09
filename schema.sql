-- Titrate Testing — D1 schema
-- Run this once in the Cloudflare dashboard's D1 "Console" tab
-- (Workers & Pages > D1 > your database > Console), or via wrangler.

DROP TABLE IF EXISTS batches;
DROP TABLE IF EXISTS vendors;

CREATE TABLE vendors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('verified', 'batch_verified', 'flagged')),
  website TEXT,
  notes TEXT
);

CREATE TABLE batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id TEXT UNIQUE NOT NULL,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id),
  product TEXT NOT NULL,
  labeled_mg REAL NOT NULL,
  measured_mg REAL NOT NULL,
  purity_pct REAL NOT NULL,
  test_lab TEXT NOT NULL,
  test_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pass', 'caution', 'fail')),
  coa_url TEXT
);

-- Demo / placeholder data so the site works out of the box.
-- Replace these rows with real vendor and lab-submitted results before launch.

INSERT INTO vendors (name, tier, website, notes) VALUES
  ('Placeholder Peptide Co.', 'verified', 'https://example.com', 'Demo record — replace with a real vendor.'),
  ('Sample Labs Vendor', 'batch_verified', 'https://example.com', 'Demo record — only one batch tested so far.'),
  ('Unverified Grey-Market Source', 'flagged', NULL, 'Demo record — COA could not be confirmed with issuing lab.');

INSERT INTO batches (batch_id, vendor_id, product, labeled_mg, measured_mg, purity_pct, test_lab, test_date, status, coa_url) VALUES
  ('FDT-2026-04471', 1, 'MOTS-c', 10.0, 9.92, 99.1, 'Freedom Diagnostics Testing', '2026-06-14', 'pass', 'https://example.com/coa/FDT-2026-04471'),
  ('FDT-2026-04502', 2, 'BPC-157', 5.0, 4.41, 97.8, 'Freedom Diagnostics Testing', '2026-06-20', 'caution', 'https://example.com/coa/FDT-2026-04502'),
  ('UNK-2026-00019', 3, 'TB-500', 5.0, 3.10, 91.4, 'Unconfirmed', '2026-05-02', 'fail', NULL);
