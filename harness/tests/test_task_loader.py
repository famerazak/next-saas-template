from __future__ import annotations

import unittest

from harness.task_loader import parse_task_line


class TaskLoaderTests(unittest.TestCase):
    def test_parses_tagged_task(self) -> None:
        line = "- [ ] **S99 - User can archive project** [app][auth][rbac]"
        task = parse_task_line(line, 1)
        self.assertIsNotNone(task)
        assert task is not None
        self.assertEqual(task.id, "S99")
        self.assertEqual(task.title, "User can archive project")
        self.assertEqual(task.tags, ["app", "auth", "rbac"])
        self.assertEqual(task.status, "open")

    def test_parses_untagged_task(self) -> None:
        line = "- [ ] **S01 - Public auth pages render**"
        task = parse_task_line(line, 2)
        self.assertIsNotNone(task)
        assert task is not None
        self.assertEqual(task.id, "S01")
        self.assertEqual(task.tags, [])

    def test_slug_fallback(self) -> None:
        line = "- [ ] **Task without id** [ui]"
        task = parse_task_line(line, 3)
        self.assertIsNotNone(task)
        assert task is not None
        self.assertEqual(task.id, "task-without-id")


if __name__ == "__main__":
    unittest.main()
