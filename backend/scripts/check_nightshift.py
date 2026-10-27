from __future__ import annotations

import argparse
import asyncio

from pydantic import ValidationError

from app.agent.errors import ModelError
from app.config import get_settings
from app.services.model import NightshiftClient
from app.services.agent import AgentService
from app.utils.token_tracker import Usage


async def check(*, generate: bool = False) -> None:
    settings = get_settings()
    client = NightshiftClient(settings)
    models = await client.models()
    print("Nightshift authenticated model discovery: OK.")
    print("Available routing modes: " + ", ".join(models))
    if settings.meterless_model not in models:
        raise ModelError("METERLESS_MODEL is not advertised by this Nightshift runtime.")
    print(f"Configured route: {settings.meterless_model}.")
    if not generate:
        print("No generation requested. Use --generate to test the configured fleet (may incur costs).")
        return
    usage = Usage()
    characters = 0
    async for chunk in client.stream("Briefly explain what an initial public offering is in one sentence."):
        characters += len(chunk.content)
        AgentService._record_usage(usage, chunk)
    print(f"Nightshift streamed text completion: OK ({characters} characters).")
    print(f"Runtime-reported model: {usage.model or 'not supplied'}.")
    print(f"Reported tokens: input={usage.prompt_tokens}, output={usage.completion_tokens}.")
    print("The route does not pin NVIDIA by itself; confirm Nemotron selection in Nightshift's fleet/receipts.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Check the configured Nightshift proxy without exposing its token.")
    parser.add_argument(
        "--generate", action="store_true",
        help="Also generate a short public-text answer through Nightshift (may incur provider costs).",
    )
    args = parser.parse_args()
    try:
        asyncio.run(check(generate=args.generate))
    except (ModelError, ValidationError) as exc:
        parser.exit(1, f"Nightshift check failed: {exc}\n")


if __name__ == "__main__":
    main()
