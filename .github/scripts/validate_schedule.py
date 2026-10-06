import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA_FILE = ROOT / "data" / "schedule.json"
KINDS = {"anime", "manga", "game"}
STATUSES = {"confirmed", "estimate", "pending"}


def main():
    payload = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    items = payload.get("items")
    if not isinstance(items, list):
        raise ValueError("items must be an array")
    seen = set()
    for number, item in enumerate(items, 1):
        prefix = f"items[{number}]"
        if item.get("kind") not in KINDS:
            raise ValueError(f"{prefix}: invalid kind")
        if item.get("status") not in STATUSES:
            raise ValueError(f"{prefix}: invalid status")
        for field in ("series", "title", "dateLabel", "source", "url"):
            if not isinstance(item.get(field), str) or not item[field].strip():
                raise ValueError(f"{prefix}: missing {field}")
        if item["date"] is not None:
            if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", item["date"]):
                raise ValueError(f"{prefix}: date must be YYYY-MM-DD or null")
            date.fromisoformat(item["date"])
        if not item["url"].startswith("https://"):
            raise ValueError(f"{prefix}: source URL must use HTTPS")
        if not isinstance(item.get("filters"), list) or not all(isinstance(tag, str) for tag in item["filters"]):
            raise ValueError(f"{prefix}: filters must be an array of strings")
        identity = (item["kind"], item["series"], item["title"], item.get("date"))
        if identity in seen:
            raise ValueError(f"{prefix}: duplicate schedule item")
        seen.add(identity)
    print(f"Validated {len(items)} schedule items.")


if __name__ == "__main__":
    main()

