"""Allowlisted subprocess wrapper for EstateScout (no shell)."""

from __future__ import annotations

import os
import shlex
import subprocess
import sys

_ALLOWED = frozenset({"mkdir", "mv", "ls", "cp"})


def _argv_for_subprocess(argv: list[str]) -> list[str]:
    """Map allowlisted Unix-style commands to invocations that work on Windows."""
    if sys.platform != "win32" or not argv:
        return argv
    cmd, *rest = argv
    if cmd == "ls":
        return ["cmd", "/c", "dir"] + rest
    if cmd == "mkdir":
        return ["cmd", "/c", "mkdir"] + rest
    if cmd == "mv":
        return ["cmd", "/c", "move"] + rest
    if cmd == "cp":
        return ["cmd", "/c", "copy"] + rest
    return argv


def run_bash(command: str) -> dict:
    """
    Parse ``command`` into argv and run it with :func:`subprocess.run` (``shell=False``).

    Only the executables ``mkdir``, ``mv``, ``ls``, and ``cp`` are permitted (first argv
    token after parsing). Returns ``{"stdout", "stderr", "returncode"}``.

    Raises:
        ValueError: If the command is empty, unparseable, or the first token is not allowed.
    """
    raw = command.strip()
    if not raw:
        raise ValueError("command is empty")

    try:
        argv = shlex.split(raw, posix=os.name == "posix")
    except ValueError as exc:
        raise ValueError(f"invalid command quoting: {exc}") from exc

    if not argv:
        raise ValueError("command is empty")

    exe = argv[0]
    if exe not in _ALLOWED:
        allowed = ", ".join(sorted(_ALLOWED))
        raise ValueError(f"command not allowed: {exe!r} (allowed: {allowed})")

    run_argv = _argv_for_subprocess(argv)

    try:
        completed = subprocess.run(
            run_argv,
            capture_output=True,
            text=True,
            timeout=120,
        )
    except subprocess.TimeoutExpired as exc:
        raise ValueError(f"command timed out: {raw!r}") from exc

    return {
        "stdout": completed.stdout or "",
        "stderr": completed.stderr or "",
        "returncode": completed.returncode,
    }
