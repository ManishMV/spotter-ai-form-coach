"""Turns evals/labels.xlsx (filled in by hand, one row per rep) into evals/labels.csv, which the eval page reads.
Runs automatically with `npm run eval`. Does nothing if there's no labels.xlsx."""
import sys
from pathlib import Path
from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parent.parent
# Optional: other input/output paths (for testing).
XLSX = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "evals" / "labels.xlsx"
CSV = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "evals" / "labels.csv"

if not XLSX.exists():
    print("No evals/labels.xlsx: using evals/labels.csv as it is.")
    raise SystemExit(0)

wb = load_workbook(XLSX, data_only=True)
clean = lambda v: " ".join(str(v).replace("(", "[").replace(")", "]").replace("|", "/").split()) if v not in (None, "") else ""

lines = [
    "# Generated from evals/labels.xlsx by scripts/labels_from_excel.py: edit the spreadsheet, not this file.",
    "file, exercise, device, reps",
]
for sheet, exercise in (("Squats", "squat"), ("Push-ups", "pushup")):
    if sheet not in wb.sheetnames:
        continue
    ws = wb[sheet]
    clips: list[dict] = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        file, device, _rep, label, rep_note, video_note = (list(row) + [None] * 6)[:6]
        if file:  # first row of a new video
            clips.append({"file": str(file).strip(), "device": (device or "phone").strip().lower(), "reps": [], "note": clean(video_note)})
        if label and clips:
            word = str(label).strip().lower()
            note = clean(rep_note)
            clips[-1]["reps"].append(f"{word}({note})" if note else word)
    for c in clips:
        if not c["reps"]:
            continue  # video not labelled yet
        line = f"{c['file']}, {exercise}, {c['device']}, {' '.join(c['reps'])}"
        lines.append(line + (f" | {c['note']}" if c["note"] else ""))

CSV.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"evals/labels.csv: {len(lines) - 2} labelled videos")
