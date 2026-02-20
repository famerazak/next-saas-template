from __future__ import annotations

import re
from pathlib import Path

from harness.types import TaskRecord

_TASK_PATTERN = re.compile(
    r"^\s*-\s\[(?P<status>[ xX])]\s\*\*(?P<body>.+?)\*\*(?P<tags>(?:\s*\[[A-Za-z0-9_-]+])*)\s*$"
)
_TAG_PATTERN = re.compile(r"\[([A-Za-z0-9_-]+)]")
_ID_PATTERN = re.compile(r"^[A-Za-z0-9._-]+$")


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return slug or "task"


def parse_task_line(line: str, source_line: int) -> TaskRecord | None:
    match = _TASK_PATTERN.match(line)
    if not match:
        return None

    status = "done" if match.group("status").lower() == "x" else "open"
    body = match.group("body").strip()
    tags = [tag.lower() for tag in _TAG_PATTERN.findall(match.group("tags") or "")]

    task_id: str
    title: str
    if " - " in body:
        maybe_id, maybe_title = body.split(" - ", 1)
        if _ID_PATTERN.match(maybe_id.strip()):
            task_id = maybe_id.strip()
            title = maybe_title.strip()
        else:
            task_id = slugify(body)
            title = body
    else:
        task_id = slugify(body)
        title = body

    return TaskRecord(
        id=task_id,
        title=title,
        tags=tags,
        status=status,
        source_line=source_line,
    )


def load_tasks(tasks_file: str | Path) -> list[TaskRecord]:
    path = Path(tasks_file)
    if not path.exists():
        raise FileNotFoundError(f"Tasks file not found: {path}")

    tasks: list[TaskRecord] = []
    for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        task = parse_task_line(line, lineno)
        if task:
            tasks.append(task)

    return tasks
