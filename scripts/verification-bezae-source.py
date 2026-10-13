"""Read-only selected-reading sequence, independent of the display importer.

Excludes running titles and marginal notes, decodes XML entities, joins words
across milestones, and retains verse continuations. Does not adjudicate hands.
"""
import collections
import json
import pathlib
import re
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parent.parent
NS = "{http://www.tei-c.org/ns/1.0}"
BOOKS = {"01": "matthew", "02": "mark", "03": "luke", "04": "john"}


def excluded(e):
    return e.tag in {NS + "fw", NS + "note"} or (e.tag == NS + "seg" and e.get("type") == "margin")


def selected_text(e):
    if excluded(e):
        return ""
    if e.tag == NS + "app":
        reading = e.find(NS + "rdg")
        return selected_text(reading) if reading is not None else ""
    return (e.text or "") + "".join(selected_text(c) + (c.tail or "") for c in e)


def parse(side):
    result = collections.defaultdict(list)

    def walk(e, reference=None):
        if excluded(e):
            return
        if e.tag == NS + "ab":
            m = re.match(r"^B(\d+)K(\d+)V(\d+)", e.get("n", ""))
            reference = f"{BOOKS[m[1]]} {int(m[2])}:{int(m[3])}" if m and m[1] in BOOKS and int(m[3]) > 0 else None
        if e.tag == NS + "app":
            reading = e.find(NS + "rdg")
            if reading is not None:
                walk(reading, reference)
            return
        if e.tag == NS + "w" and reference:
            text = re.sub(r"\s+", "", selected_text(e))
            if text:
                result[reference].append(text)
            return
        for c in e:
            walk(c, reference)

    walk(ET.parse(ROOT / f"data/sources/bezae/Bezae-{side}.xml").getroot())
    return result


if __name__ == "__main__":
    print(json.dumps({side: parse(side) for side in ["Greek", "Latin"]}, ensure_ascii=True))
