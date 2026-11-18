"""Makes eval-ready copies of the recorded clips: H.264 MP4, upright, at most 720p, in evals/clips/ready/.
Phones often record HEVC, which the browser can't always open. Originals are left as they are, in any subfolder.
Runs automatically with `npm run eval`; only converts clips that are new or changed.
Needs ffmpeg: on PATH, or the imageio-ffmpeg Python package, or FFMPEG=path/to/ffmpeg."""
import os
import shutil
import subprocess
from pathlib import Path

CLIPS = Path(__file__).resolve().parent.parent / "evals" / "clips"
READY = CLIPS / "ready"


def ffmpeg() -> str | None:
    if os.environ.get("FFMPEG"):
        return os.environ["FFMPEG"]
    try:
        import imageio_ffmpeg  # type: ignore
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        return shutil.which("ffmpeg")


sources = [p for p in CLIPS.rglob("*") if p.suffix.lower() in (".mp4", ".mov") and READY not in p.parents]
names = [p.stem.lower() for p in sources]
dupes = {n for n in names if names.count(n) > 1}
if dupes:
    raise SystemExit(f"Two clips share a name ({', '.join(sorted(dupes))}): give each video a different name.")

todo = [p for p in sources if not (READY / f"{p.stem}.mp4").exists() or (READY / f"{p.stem}.mp4").stat().st_mtime < p.stat().st_mtime]
if not todo:
    print(f"evals/clips/ready: {len(sources)} clips ready")
    raise SystemExit(0)
exe = ffmpeg()
if not exe:
    raise SystemExit("ffmpeg not found: install it (or `pip install imageio-ffmpeg`) to prepare new clips.")
READY.mkdir(exist_ok=True)
for i, src in enumerate(todo, 1):
    out = READY / f"{src.stem}.mp4"
    print(f"[{i}/{len(todo)}] {src.relative_to(CLIPS)} -> ready/{out.name}")
    subprocess.run(
        [exe, "-y", "-loglevel", "error", "-i", str(src), "-an",
         # Shorter side at most 720 px (like a live camera feed), even sizes, 30 fps.
         "-vf", "scale='if(gt(iw,ih),-2,min(720,iw))':'if(gt(iw,ih),min(720,ih),-2)',fps=30",
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(out)],
        check=True,
    )
print(f"evals/clips/ready: {len(sources)} clips ready")
