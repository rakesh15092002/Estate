"""GET /files/{path} — serve agent-generated screenshots and lease drafts from disk."""

from pathlib import Path
import urllib.parse

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter(prefix="/files", tags=["files"])

# Project: backend/data/...
_DATA_ROOT = Path(__file__).resolve().parent.parent / "data"


@router.get("/{file_path:path}")
async def serve_file(file_path: str) -> FileResponse:
    """Serve files under backend/data/ only (no path traversal)."""
    file_path = urllib.parse.unquote(file_path)
    candidate = (_DATA_ROOT / file_path).resolve()
    try:
        candidate.relative_to(_DATA_ROOT.resolve())
    except ValueError:
        raise HTTPException(status_code=404, detail="Invalid path")
    if not candidate.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(candidate)
