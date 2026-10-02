#!/usr/bin/env bash
# Export the recent git history (subject + body of each commit) to backend/app/data/work_log.json.
# The daily writing-ideas job reads it to suggest posts about things the owner actually built.
# The backend image has no git, so deploy.sh runs this before building; run it by hand for dev.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backend/app/data
git log -n 400 --date=short --pretty=format:'%h%x1f%ad%x1f%s%x1f%b%x1e' | python3 -c '
import json, sys
records = []
for raw in sys.stdin.read().split("\x1e"):
    raw = raw.strip("\n")
    if not raw:
        continue
    short, date, subject, body = (raw.split("\x1f") + ["", "", "", ""])[:4]
    body = "\n".join(line for line in body.splitlines() if not line.startswith("Co-Authored-By")).strip()
    records.append({"hash": short, "date": date, "subject": subject, "body": body[:1500]})
with open("backend/app/data/work_log.json", "w", encoding="utf-8") as fh:
    json.dump(records, fh, ensure_ascii=False, indent=1)
print(f"work log: {len(records)} commits -> backend/app/data/work_log.json")
'
