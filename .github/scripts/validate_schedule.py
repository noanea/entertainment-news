import json
import re
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2]
DATA_FILE = ROOT / "data" / "schedule.json"
KINDS = {"anime", "manga", "game"}
STATUSES = {"confirmed", "estimate", "pending"}
FILTERS_BY_KIND = {
    "anime": {"TV", "Netflix", "Prime Video", "Disney+", "劇場"},
    "manga": {"ジャンプ", "マガジン", "サンデー", "チャンピオン", "その他"},
    "game": {"Steam", "PS5", "PS4", "Switch 2", "Switch", "Xbox", "スマホ"},
}


def main():
    payload = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("schedule root must be an object")
    if not isinstance(payload.get("version"), str) or not payload["version"].strip():
        raise ValueError("version must be a non-empty string")
    if not isinstance(payload.get("updatedAt"), str):
        raise ValueError("updatedAt must use YYYY-MM-DD")
    date.fromisoformat(payload["updatedAt"])
    items = payload.get("items")
    if not isinstance(items, list):
        raise ValueError("items must be an array")
    seen = set()
    for number, item in enumerate(items, 1):
        prefix = f"items[{number}]"
        if not isinstance(item, dict):
            raise ValueError(f"{prefix}: item must be an object")
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
            if item["status"] == "pending":
                raise ValueError(f"{prefix}: pending items cannot have an exact date")
        url = urlsplit(item["url"])
        if url.scheme != "https" or not url.hostname or url.username or url.password:
            raise ValueError(f"{prefix}: source URL must use HTTPS")
        if not isinstance(item.get("filters"), list) or not all(isinstance(tag, str) for tag in item["filters"]):
            raise ValueError(f"{prefix}: filters must be an array of strings")
        if len(item["filters"]) != len(set(item["filters"])):
            raise ValueError(f"{prefix}: filters must not contain duplicates")
        if not set(item["filters"]).issubset(FILTERS_BY_KIND[item["kind"]]):
            raise ValueError(f"{prefix}: filter is not valid for its kind")
        if item.get("basis") is not None and not isinstance(item["basis"], str):
            raise ValueError(f"{prefix}: basis must be text")
        if item.get("detail") is not None and not isinstance(item["detail"], str):
            raise ValueError(f"{prefix}: detail must be text")
        identity = (item["kind"], item["series"], item["title"], item.get("date"))
        if identity in seen:
            raise ValueError(f"{prefix}: duplicate schedule item")
        seen.add(identity)
    print(f"Validated {len(items)} schedule items.")


if __name__ == "__main__":
    main()

