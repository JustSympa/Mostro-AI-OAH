from __future__ import annotations

import logging
from pathlib import Path
from typing import Protocol

logger = logging.getLogger("mostro.email")


class EmailSender(Protocol):
    async def send(self, to: str, subject: str, body: str) -> None: ...


class StdoutEmailSender:
    """Dev/examiner sender: log to stdout and optionally write a local file."""

    def __init__(self, output_dir: Path | None = Path("emails")) -> None:
        self.output_dir = output_dir

    async def send(self, to: str, subject: str, body: str) -> None:
        banner = (
            "\n======== EMAIL (stubbed sender; not delivered) ========\n"
            f"To: {to}\n"
            f"Subject: {subject}\n"
            f"{body}\n"
            "======================================================\n"
        )
        logger.info(banner)
        print(banner, flush=True)
        if self.output_dir is not None:
            self.output_dir.mkdir(parents=True, exist_ok=True)
            safe = to.replace("@", "_at_").replace("/", "_")
            path = self.output_dir / f"{safe}.txt"
            path.write_text(f"Subject: {subject}\n\n{body}\n", encoding="utf-8")


email_sender: EmailSender = StdoutEmailSender()
