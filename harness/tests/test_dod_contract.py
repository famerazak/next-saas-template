from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from harness.dod_contract import DoDContractError, ensure_tag_has_test_coverage, load_contract


class DoDContractTests(unittest.TestCase):
    def test_load_contract_for_pilot_task(self) -> None:
        contract = load_contract("S01")
        self.assertEqual(contract["task_id"], "S01")
        self.assertEqual(contract["required_evidence"]["playwright"]["tag"], "@S01")

    def test_missing_contract_raises(self) -> None:
        with self.assertRaises(DoDContractError):
            load_contract("S00_DOES_NOT_EXIST")

    def test_tag_coverage_fails_when_missing(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            (root / "dummy.spec.ts").write_text("test('x', async () => {});", encoding="utf-8")
            with self.assertRaises(DoDContractError):
                ensure_tag_has_test_coverage("@S01", test_root=root)


if __name__ == "__main__":
    unittest.main()
