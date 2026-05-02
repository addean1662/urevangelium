# Font Licenses

All fonts in this directory are locally hosted. No font CDN calls are made at runtime.

---

## Cardo

**Role:** Primary Greek font; fallback for all scripts  
**License:** SIL Open Font License 1.1 (OFL)  
**Source:** https://software.sil.org/cardo/ or via Google Fonts  
**Self-hosting:** Explicitly permitted under SIL OFL. No attribution required in UI, but license file must accompany distribution.  
**Files needed:** `Cardo-Regular.woff2`, `Cardo-Italic.woff2`, `Cardo-Bold.woff2`  
**Status:** Files to be downloaded from source before production deployment.

---

## EB Garamond

**Role:** Primary Latin font  
**License:** SIL Open Font License 1.1 (OFL)  
**Source:** https://github.com/octaviopardo/EBGaramond12 or via Google Fonts  
**Self-hosting:** Explicitly permitted under SIL OFL.  
**Files needed:** `EBGaramond-Regular.woff2`, `EBGaramond-Italic.woff2`  
**Status:** Files to be downloaded from source before production deployment.

---

## Beth Mardutho Estrangela Edessa (OFL Edition)

**Role:** Primary Syriac font  
**License:** SIL Open Font License 1.1 (OFL)  
**Source:** https://bethmardutho.org/tools/ (Beth Mardutho: The Syriac Institute)  
**Self-hosting:** Explicitly permitted under SIL OFL.  
**Notes:** This is the OFL-licensed Estrangela font from Beth Mardutho, distinct from the Microsoft-bundled Estrangelo Edessa font which is NOT freely redistributable. Only the Beth Mardutho OFL edition may be used here.  
**Files needed:** `EstrangeloEdessa-BM.woff2` (or equivalent filename from the Beth Mardutho distribution)  
**Status:** Files to be downloaded from bethmardutho.org before production deployment.

---

## Serto Jerusalem

**Role:** Syriac fallback font  
**License:** SIL Open Font License 1.1 (OFL)  
**Source:** https://software.sil.org/scheherazade/ — or search SIL font catalog for Serto Jerusalem  
**Self-hosting:** Explicitly permitted under SIL OFL.  
**Files needed:** `SertoJerusalem.woff2`  
**Status:** Files to be downloaded from source before production deployment.

---

## v2: SBL Greek (PENDING LICENSE CLARIFICATION)

**Role:** Reserved as future primary Greek font (v2 feature)  
**License:** SBL Font EULA (free for non-commercial use, attribution required)  
**Issue:** The SBL Font EULA permits free use but does not explicitly grant @font-face self-hosting / web embedding rights. Scholarly opinion on whether self-hosting falls inside or outside that license is split.  
**Action required:** Obtain written clarification from the Society of Biblical Literature before using SBL Greek as a web font in this project.  
**Contact:** fonts@sbl-site.org  
**v2 hook:** A commented-out `fontGreek` config entry is present in `lib/fonts.ts` to swap in SBL Greek once clearance is obtained.  
**Status:** DO NOT include SBL Greek font files in this repository until license is clarified in writing.

---

## Fonts NOT permitted in this project

| Font | Reason |
|------|--------|
| Estrangelo Edessa (Microsoft) | Ships with Windows; not freely redistributable for web embedding |
| Any Google Fonts CDN-loaded font | Architectural lock: no CDN font calls at runtime |
