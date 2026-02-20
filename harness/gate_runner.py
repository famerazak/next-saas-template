from __future__ import annotations

import os
import subprocess
import time
from typing import Any

from harness.types import GateResult


def run_gate(
    gate_id: str,
    gate_cfg: dict[str, Any],
    attempt: int,
    extra_env: dict[str, str] | None = None,
) -> GateResult:
    cmd = gate_cfg["command"]
    timeout = int(gate_cfg.get("timeout_seconds", 900))
    env = os.environ.copy()
    if extra_env:
        env.update(extra_env)

    start = time.monotonic()
    proc = subprocess.run(
        cmd,
        shell=True,
        capture_output=True,
        text=True,
        timeout=timeout,
        env=env,
    )
    duration_ms = int((time.monotonic() - start) * 1000)

    status = "passed" if proc.returncode == 0 else "failed"
    return GateResult(
        gate_id=gate_id,
        status=status,
        attempt=attempt,
        duration_ms=duration_ms,
        command=cmd,
        stdout=proc.stdout,
        stderr=proc.stderr,
        return_code=proc.returncode,
    )
