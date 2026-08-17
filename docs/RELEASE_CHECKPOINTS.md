# Release checkpoints

## Pre-Sources-page fallback — 2026-08-16

- Purpose: known rollback point before adding and publishing the public `/sources` route.
- Local Git branch: `main`
- Local Git commit: `7f2db88a71f3e79ad372b299e61b389a547a01f7`
- Production deployment: `https://urevangelium-i7bin78ic-anthony-deans-projects.vercel.app`
- Deployment state when recorded: `Ready`
- Recorded by: Codex at the user's request.

The local worktree already contained extensive uncommitted research and application changes when
this checkpoint was created. The Git commit identifies the last committed base, while the Vercel
deployment is the recoverable pre-publication production artifact. If a later publication damages
the site, promote the deployment above back to production with Vercel rather than resetting or
discarding the local worktree.

## Sources-page production release — 2026-08-16

- Production deployment: `https://urevangelium-55s25ua1b-anthony-deans-projects.vercel.app`
- Deployment ID: `dpl_2hSBhcLoV1KN5QQX7SjXGWnwRcwW`
- Production aliases verified: `https://urevangelium.com`, `https://urevangelium.vercel.app`
- `/sources` verification: HTTP 200 with page title and primary navigation present.
- `/matthew/1/1` verification: HTTP 200 with the Sources navigation entry present.

## Source-governance foundation release — 2026-08-16

- Purpose: replace the preliminary source assessment with an authoritative per-column source and rules manifest.
- Manifest version: `2026-08-16.1`
- Preview deployment: `https://urevangelium-cgs1ddkxw-anthony-deans-projects.vercel.app`
- Preview deployment ID: `dpl_Bv1tPyy5bs7xwnWopFiwWwVkK4NR`
- Production deployment: `https://urevangelium-ozzuttmp8-anthony-deans-projects.vercel.app`
- Production deployment ID: `dpl_BDcg3QrTXXLickssDVGdoyToADDw`
- Production aliases verified: `https://urevangelium.com`, `https://urevangelium.vercel.app`
- `/sources` verification: HTTP 200; manifest version, papyri composite rules, and manuscript rebuild warnings present.
- `/matthew/1/1` verification: HTTP 200.
- Source-policy validation: 0 errors; three declared warnings for Vaticanus, Sinaiticus, and Byzantine legacy fallbacks.
- Existing data-integrity validation: 0 violations after correcting the malformed Bezae loss cell at Matthew 1:20 row 10.
- Rollback remains the pre-sources deployment recorded above; no existing rollback artifact was removed.

## Pre-Vaticanus-regeneration checkpoint — 2026-08-16

- Purpose: immutable production fallback before any live GA 03 column regeneration.
- Production deployment: `https://urevangelium-ozzuttmp8-anthony-deans-projects.vercel.app`
- Production deployment ID: `dpl_BDcg3QrTXXLickssDVGdoyToADDw`
- State: `Ready`; aliases `urevangelium.com` and `urevangelium.vercel.app` verified.
- GA 03 pilot remains read-only. No live Vaticanus Gospel cell was changed at this checkpoint.
- Shadow data: `docs/audits/vaticanus-shadow-matthew-1.json`.
- Pilot result: 454 verses; 93.7% normalized LCS agreement; 32.8% exact normalized verse sequences; zero MES parse errors.

## Vaticanus pilot publication — 2026-08-16

- Purpose: publish the pinned GA 03 source record and manifest `2026-08-16.2`; no live Vaticanus Gospel text changed.
- Production deployment: `https://urevangelium-cnpaf5fro-anthony-deans-projects.vercel.app`
- Production deployment ID: `dpl_BN3Q7PXQW9CbCJ7hsEvkNh6DRY7K`
- Production alias: `https://urevangelium.com`
- Verification: `/sources` and `/matthew/1/1` HTTP 200; GA 03 commit present; Vaticanus remains visibly marked `Requires source rebuild`.
- Runtime error scan: clean.
