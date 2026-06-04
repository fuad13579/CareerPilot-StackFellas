"""Dump the frontend file tree with sizes to a temp file for inspection."""
import os
from pathlib import Path

ROOT = Path(r"c:\Users\FUAD\source\repos\CareerPilot-StackFellas\frontend\src")
out_lines = []
for p in sorted(ROOT.rglob("*")):
    if p.is_file():
        rel = p.relative_to(ROOT)
        size = p.stat().st_size
        out_lines.append(f"{size:>8}  {rel}")
out = "\n".join(out_lines)
print(out)
print("---SUMMARY---")
print(f"total_files: {len(out_lines)}")
print(f"total_bytes: {sum(int(l.split()[0]) for l in out_lines if l.split()[0].isdigit())}")
