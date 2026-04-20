"""Write structured text artifacts for EstateScout (lease drafts)."""

from __future__ import annotations

from datetime import date
from pathlib import Path


def write_lease_draft(address: str, price: str, folder_path: str) -> str:
    """
    Create ``lease_draft.txt`` under ``folder_path`` with a simple lease template.

    Returns the absolute path to the written file.
    """
    root = Path(folder_path).expanduser().resolve()
    root.mkdir(parents=True, exist_ok=True)

    today = date.today().isoformat()
    body = f"""LEASE AGREEMENT (DRAFT)
{'=' * 50}

Property address: {address.strip()}
Monthly rent / price: {price.strip()}
Date of draft: {today}

Tenant: [TO BE FILLED]
Landlord: [TO BE FILLED]

Terms (summary)
---------------
The tenant agrees to pay the rent stated above on the schedule agreed by the parties.
The property shall be used only as a private residence unless otherwise permitted in writing.
The tenant shall keep the premises in good order and shall comply with applicable laws and
any reasonable building rules supplied by the landlord. Either party may request revisions
to this draft before execution; this document is not binding until signed by both parties.

{'=' * 50}
End of draft
"""

    out = root / "lease_draft.txt"
    out.write_text(body, encoding="utf-8", newline="\n")
    return str(out)
