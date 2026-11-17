"""Creates evals/labels.xlsx: the sheet for labelling eval clips by hand (one row per rep).
Run once: python scripts/make_labels_workbook.py   (won't overwrite an existing file unless --force)."""
import sys
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation

OUT = Path(__file__).resolve().parent.parent / "evals" / "labels.xlsx"
if OUT.exists() and "--force" not in sys.argv:
    sys.exit(f"{OUT} already exists (use --force to overwrite)")

SQUAT = [
    ("good", "A proper squat: thighs at least parallel, chest up, smooth."),
    ("half", "Not deep enough: stopped well above parallel."),
    ("chest", "Chest dropped: leaned the chest far forward."),
    ("hips", "Hips rose first: on the way up, hips shot up before the chest."),
    ("fast", "Bounced or rushed: dropped and popped up with no control."),
    ("?", "Not sure what it was: lined up with Spotter's reps but not scored."),
]
PUSHUP = [
    ("good", "A proper push-up: body straight, upper arm about level at the bottom, arms straight at the top."),
    ("half", "Not deep enough: only went part of the way down."),
    ("knee", "Knees on the floor (knee push-up)."),
    ("sag", "Hips sagging: hips dropped below the shoulder-to-ankle line."),
    ("pike", "Hips piked: hips pushed up high."),
    ("bent", "Arms bent at the top: didn't straighten the arms."),
    ("fast", "Bounced or rushed: dropped and pushed up with no control."),
    ("?", "Not sure what it was: lined up with Spotter's reps but not scored."),
]
REPS_PER_VIDEO = 12  # leave unused rep rows empty

FONT = "Arial"
H1 = Font(name=FONT, size=14, bold=True)
H2 = Font(name=FONT, size=11, bold=True)
BODY = Font(name=FONT, size=10)
MUTED = Font(name=FONT, size=10, color="666666")
HEAD_FILL = PatternFill("solid", fgColor="1F2937")
HEAD_FONT = Font(name=FONT, size=10, bold=True, color="FFFFFF")
FILL_IN = PatternFill("solid", fgColor="FFF4C2")  # cells to fill in
EXAMPLE = PatternFill("solid", fgColor="EAF2FF")
THIN = Side(style="thin", color="D0D0D0")
BLOCK = Side(style="medium", color="808080")
WRAP = Alignment(wrap_text=True, vertical="top")

wb = Workbook()

# ---------- Sheet 1: legend ----------
lg = wb.active
lg.title = "Legend"
lg.column_dimensions["A"].width = 14
lg.column_dimensions["B"].width = 90
r = 1
lg.cell(r, 1, "How to label the eval videos").font = H1
r += 2
steps = [
    "1. Put the videos in evals/clips/ and name them like the sheets (sq-01.mp4 … sq-10.mp4, pu-01.mp4 … pu-10.mp4), or type your own file names in the Video file column.",
    "2. On the Squats and Push-ups sheets, give every rep ONE label word from the lists below, in the order you did them. Leave unused rep rows empty.",
    "3. Notes are optional: a note for one rep goes in 'Note on this rep'; a note about the whole video goes in 'Note on the whole video' (first row of that video).",
    "4. Label what you actually did (your judgement, as if you were the coach), not what Spotter said.",
    "5. Only the yellow cells need filling in. Save the file and tell Claude: it turns this into evals/labels.csv and runs the eval.",
]
for s in steps:
    c = lg.cell(r, 1, s)
    c.font = BODY
    c.alignment = WRAP
    lg.merge_cells(start_row=r, start_column=1, end_row=r, end_column=2)
    lg.row_dimensions[r].height = 28
    r += 1
r += 1
for title, rows in (("Squat labels", SQUAT), ("Push-up labels", PUSHUP)):
    lg.cell(r, 1, title).font = H2
    r += 1
    for col, h in ((1, "Label"), (2, "Meaning")):
        c = lg.cell(r, col, h)
        c.font, c.fill = HEAD_FONT, HEAD_FILL
    r += 1
    for word, meaning in rows:
        a = lg.cell(r, 1, word)
        a.font = Font(name=FONT, size=10, bold=True)
        b = lg.cell(r, 2, meaning)
        b.font = BODY
        b.alignment = WRAP
        for col in (1, 2):
            lg.cell(r, col).border = Border(bottom=THIN)
        r += 1
    r += 1
lg.cell(r, 1, "Example (filled in)").font = H2
r += 1
ex_head = ["Video file", "Device", "Rep #", "Label", "Note on this rep", "Note on the whole video"]
ex_rows = [
    ["sq-01.mp4", "phone", 1, "good", "", "Dim room, facing left"],
    ["", "", 2, "good", "", ""],
    ["", "", 3, "half", "Stopped early, legs tired", ""],
    ["", "", 4, "chest", "", ""],
    ["", "", 5, "?", "Not sure, slipped a bit", ""],
]
for i, h in enumerate(ex_head, start=1):
    c = lg.cell(r, i, h)
    c.font, c.fill = HEAD_FONT, HEAD_FILL
r += 1
for row in ex_rows:
    for i, v in enumerate(row, start=1):
        c = lg.cell(r, i, v)
        c.font, c.fill = BODY, EXAMPLE
    r += 1
for col, w in zip("CDEF", (8, 10, 30, 30)):
    lg.column_dimensions[col].width = max(lg.column_dimensions[col].width or 0, w)


# ---------- Sheets 2 and 3: one row per rep ----------
def rep_sheet(name: str, prefix: str, labels: list[tuple[str, str]]):
    ws = wb.create_sheet(name)
    heads = ["Video file", "Device", "Rep #", "Label", "Note on this rep (optional)", "Note on the whole video (optional)"]
    widths = [14, 10, 7, 10, 42, 42]
    for i, (h, w) in enumerate(zip(heads, widths), start=1):
        c = ws.cell(1, i, h)
        c.font, c.fill = HEAD_FONT, HEAD_FILL
        c.alignment = Alignment(vertical="center")
        ws.column_dimensions[chr(64 + i)].width = w
    ws.row_dimensions[1].height = 22
    ws.freeze_panes = "A2"
    words = ",".join(w for w, _ in labels)
    dv_label = DataValidation(type="list", formula1=f'"{words}"', allow_blank=True,
                              error=f"Use one of: {words}", errorTitle="Unknown label", showErrorMessage=True)
    dv_device = DataValidation(type="list", formula1='"phone,laptop"', allow_blank=False)
    ws.add_data_validation(dv_label)
    ws.add_data_validation(dv_device)
    row = 2
    for v in range(1, 11):
        for rep in range(1, REPS_PER_VIDEO + 1):
            first = rep == 1
            vals = [f"{prefix}-{v:02d}.mp4" if first else "", "phone" if first else "", rep, "", "", ""]
            for i, val in enumerate(vals, start=1):
                c = ws.cell(row, i, val)
                c.font = BODY if (i != 3) else MUTED
                c.border = Border(bottom=THIN, top=BLOCK if first else None)
            for i in (4, 5):  # label + rep note: always fill in
                ws.cell(row, i).fill = FILL_IN
            if first:
                for i in (1, 2, 6):
                    ws.cell(row, i).fill = FILL_IN
                ws.cell(row, 1).font = Font(name=FONT, size=10, bold=True)
                dv_device.add(ws.cell(row, 2))
            dv_label.add(ws.cell(row, 4))
            row += 1
    return ws


rep_sheet("Squats", "sq", SQUAT)
rep_sheet("Push-ups", "pu", PUSHUP)

OUT.parent.mkdir(exist_ok=True)
wb.save(OUT)
print(f"wrote {OUT}")
