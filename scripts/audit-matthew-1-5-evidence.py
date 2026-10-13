"""Preserve the two P1 transcriptions separately; never adjudicate ink by agreement."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import unicodedata
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
sys.stdout.reconfigure(encoding="utf-8")
FILES = {
    "cntr": "data/sources/earliest-papyrus/P1.txt",
    "intf": "docs/audits/verse-review/source-checks/p1-intf-raw-matthew.xml",
}
NS = {"t": "http://www.tei-c.org/ns/1.0"}
tag = lambda e: e.tag.split("}")[-1]


def selected_children(node):
    if tag(node) != "app":
        return list(node)
    selected = [c for c in node if c.get("type") == "orig" and c.get("hand") == "firsthand"]
    if len(selected) != 1:
        raise ValueError("Ambiguous original-hand apparatus")
    return selected


def words(node):
    if tag(node) == "w":
        yield node
    else:
        for child in selected_children(node):
            yield from words(child)


def letters(node, inherited="unmarked"):
    status = {"supplied": "supplied", "unclear": "unclear"}.get(tag(node), inherited)
    result = [{"character": c, "status": status} for c in node.text or "" if c.isalpha()]
    for child in selected_children(node):
        result.extend(letters(child, status))
        result.extend({"character": c, "status": status} for c in child.tail or "" if c.isalpha())
    return result


def comparison(value):
    return "".join(c for c in unicodedata.normalize("NFD", value).lower().replace("ς", "σ") if c.isalpha())


node = """
import fs from 'node:fs';
import {parseMesLine} from './lib/sources/cntrMes.js';
import {papyrusWordEvidence,papyrusDisplayText} from './lib/sources/papyrusEvidence.mjs';
const raw=fs.readFileSync('data/sources/earliest-papyrus/P1.txt','utf8').split(/\\r?\\n/).find(l=>l.startsWith('40001005 '));
console.log(JSON.stringify({raw,words:parseMesLine(raw).baseWords.map(w=>({...w,evidence:papyrusWordEvidence(w),display:papyrusDisplayText(papyrusWordEvidence(w).visible)}))}));
"""
cntr = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", node], cwd=ROOT, encoding="utf-8"))
root = ET.fromstring((ROOT / FILES["intf"]).read_text(encoding="utf-8"))
verse = root.find('.//t:ab[@n="B01K1V5"]', NS)
if verse is None:
    raise ValueError("Missing INTF Matthew 1:5")
intf = list(words(verse))
if len(intf) != len(cntr["words"]):
    raise ValueError("Token counts differ; do not pair positions automatically")
data = json.loads((ROOT / "data/matthew/1/5.json").read_text(encoding="utf-8"))
tokens = []
for index, (a, b) in enumerate(zip(cntr["words"], intf), 1):
    chars = letters(b)
    if comparison(a["diplomatic"].replace("¯", "ν")) != comparison("".join(c["character"] for c in chars)):
        raise ValueError(f"Different underlying reading at token {index}")
    supplied = [i for i, c in enumerate(chars, 1) if c["status"] == "supplied"]
    tokens.append({
        "sourceToken": index, "cntr": a,
        "intf": {"xml": ET.tostring(b, encoding="unicode"), "letters": chars},
        "intfSuppliedPositions": supplied,
        "intfEvidenceProjection": "".join("·" if c["status"] == "supplied" else c["character"] for c in chars),
        "supplyDisagreement": a["evidence"]["missingAfter"] != supplied,
        "savedCells": [{"rowId": r["id"], "text": r["papyrus"].get("text"), "type": r["papyrus"]["type"]}
                       for r in data["rows"] if r["papyrus"].get("provenance", {}).get("sourceToken") == index],
    })
report = {
    "scope": "P1 Matthew 1:5 transcription and condition comparison; no physical-attestation certification.",
    "sources": {k: {"path": p, "sha256": hashlib.sha256((ROOT / p).read_bytes()).hexdigest()} for k, p in FILES.items()},
    "imageReview": "Existing CSNTM 678823 screenshot inspected; the disputed first ek is not sufficiently visible to adjudicate. No manuscript reading changed.",
    "records": [{"reference": "matthew 1:5", "rawCntrLine": cntr["raw"], "p1Tokens": tokens}],
}
out = ROOT / "docs/audits/verse-review/source-checks/matthew-1-5-papyrus-comparison.json"
out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"output": str(out), "positions": len(tokens), "supplyConflicts": [t["sourceToken"] for t in tokens if t["supplyDisagreement"]]}))
