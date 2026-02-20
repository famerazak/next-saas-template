from __future__ import annotations

import unittest
from unittest.mock import patch

from harness.task_diff import changed_task_ids_from_git, extract_changed_task_ids


class TaskDiffTests(unittest.TestCase):
    def test_extracts_changed_task_ids_from_diff_additions(self) -> None:
        diff = """
diff --git a/TASKS.md b/TASKS.md
index aaaaaaa..bbbbbbb 100644
--- a/TASKS.md
+++ b/TASKS.md
@@ -10,0 +11,2 @@
+- [ ] **S01 - Public auth pages render** [ui][app]
+- [x] **S22 - User can enroll in 2FA** [security][auth]
"""
        self.assertEqual(extract_changed_task_ids(diff), ["S01", "S22"])

    def test_ignores_non_task_additions(self) -> None:
        diff = """
@@ -10,0 +11,3 @@
+- random bullet
+some non-markdown line
+- [ ] **Task without explicit ID** [app]
"""
        self.assertEqual(extract_changed_task_ids(diff), [])

    def test_dedupes_multiple_hunks(self) -> None:
        diff = """
@@ -10,0 +11,1 @@
+- [ ] **S31 - Add/update card details** [billing]
@@ -40,0 +45,1 @@
+- [ ] **S31 - Add/update card details** [billing]
"""
        self.assertEqual(extract_changed_task_ids(diff), ["S31"])

    @patch("harness.task_diff.subprocess.run")
    def test_raises_when_commit_cannot_be_verified(self, run_mock) -> None:
        run_mock.return_value.returncode = 128
        run_mock.return_value.stderr = "fatal: not a git repository"
        with self.assertRaises(RuntimeError):
            changed_task_ids_from_git("base", "head", "TASKS.md")


if __name__ == "__main__":
    unittest.main()
