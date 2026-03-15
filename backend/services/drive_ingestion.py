"""
services/drive_ingestion.py
──────────────────────────────────────────────────────────
Google Drive document ingestion pipeline.
Connects to Drive, lists files, downloads text content,
and prepares it for the existing VerboAI processing pipeline.

Setup required:
  pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client

Authentication modes supported:
  1. Service Account (recommended for server): set GOOGLE_SERVICE_ACCOUNT_JSON env var
  2. API Key (public files only): set GOOGLE_API_KEY env var
  3. Simulated mode: returns mock data for development/demo
"""

import os
import io
import json
import tempfile
from typing import List, Dict, Any, Optional, Tuple


# ── Supported MIME types → our text extraction ───────────────────────────────
SUPPORTED_MIME_TYPES = {
    "text/plain":                              "text",
    "application/vnd.google-apps.document":   "gdoc",
    "application/pdf":                         "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
}


# ─────────────────────────────────────────────
# AUTHENTICATION
# ─────────────────────────────────────────────
def _get_drive_service():
    """
    Returns an authenticated Google Drive API service, or None.
    Tries: service account → API key → None (simulation mode).
    """
    sa_json = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON")
    api_key  = os.environ.get("GOOGLE_API_KEY")

    if sa_json:
        try:
            from google.oauth2 import service_account
            from googleapiclient.discovery import build

            creds_info = json.loads(sa_json)
            creds = service_account.Credentials.from_service_account_info(
                creds_info,
                scopes=["https://www.googleapis.com/auth/drive.readonly"],
            )
            return build("drive", "v3", credentials=creds)
        except Exception as e:
            print(f"[DriveIngestion] Service account auth failed: {e}")

    if api_key:
        try:
            from googleapiclient.discovery import build
            return build("drive", "v3", developerKey=api_key)
        except Exception as e:
            print(f"[DriveIngestion] API key auth failed: {e}")

    return None  # simulation mode


# ─────────────────────────────────────────────
# FILE LISTING
# ─────────────────────────────────────────────
def list_drive_files(folder_id: str) -> List[Dict[str, Any]]:
    """
    List files in a Google Drive folder.
    Returns list of {id, name, mimeType, size}.
    """
    service = _get_drive_service()

    if service is None:
        # Simulation mode — return mock file list
        return _mock_file_list(folder_id)

    try:
        query = f"'{folder_id}' in parents and trashed = false"
        results = service.files().list(
            q=query,
            fields="files(id, name, mimeType, size)",
            pageSize=50,
        ).execute()
        files = results.get("files", [])
        # Filter to supported types only
        return [f for f in files if f["mimeType"] in SUPPORTED_MIME_TYPES]
    except Exception as e:
        raise RuntimeError(f"Failed to list Drive files: {e}")


def _mock_file_list(folder_id: str) -> List[Dict[str, Any]]:
    """Returns mock files for demo/development mode."""
    return [
        {"id": "mock_001", "name": "Report_Q1_2024.txt",      "mimeType": "text/plain"},
        {"id": "mock_002", "name": "Strategy_Overview.txt",    "mimeType": "text/plain"},
        {"id": "mock_003", "name": "Meeting_Notes_March.txt",  "mimeType": "text/plain"},
    ]


# ─────────────────────────────────────────────
# FILE DOWNLOAD
# ─────────────────────────────────────────────
def download_file_as_text(file_id: str, mime_type: str, file_name: str) -> Optional[str]:
    """
    Download a Drive file and return its text content.
    Returns None if extraction fails.
    """
    service = _get_drive_service()

    if service is None:
        # Simulation — return placeholder text
        return _mock_file_content(file_name)

    try:
        file_type = SUPPORTED_MIME_TYPES.get(mime_type)

        if file_type == "gdoc":
            # Export Google Doc as plain text
            content = service.files().export(
                fileId=file_id,
                mimeType="text/plain",
            ).execute()
            return content.decode("utf-8") if isinstance(content, bytes) else str(content)

        elif file_type == "text":
            content = service.files().get_media(fileId=file_id).execute()
            return content.decode("utf-8") if isinstance(content, bytes) else str(content)

        elif file_type in ("pdf", "docx"):
            # Download to temp file and extract text
            content = service.files().get_media(fileId=file_id).execute()
            with tempfile.NamedTemporaryFile(
                suffix=f".{file_type}", delete=False
            ) as tmp:
                tmp.write(content)
                tmp_path = tmp.name
            return _extract_text_from_file(tmp_path, file_type)

    except Exception as e:
        print(f"[DriveIngestion] Failed to download {file_name}: {e}")
        return None


def _extract_text_from_file(path: str, file_type: str) -> str:
    """Extract text from PDF or DOCX files."""
    try:
        if file_type == "pdf":
            import pdfplumber
            with pdfplumber.open(path) as pdf:
                return "\n".join(page.extract_text() or "" for page in pdf.pages)
        elif file_type == "docx":
            import docx
            doc = docx.Document(path)
            return "\n".join(p.text for p in doc.paragraphs)
    except Exception as e:
        print(f"[DriveIngestion] Text extraction error: {e}")
    finally:
        try:
            os.unlink(path)
        except Exception:
            pass
    return ""


def _mock_file_content(filename: str) -> str:
    """Generates realistic mock content for simulation mode."""
    mock_contents = {
        "Report_Q1_2024.txt": (
            "Q1 2024 Performance Report. OpenAI released GPT-4 Turbo in Q1. "
            "Microsoft invested heavily in AI infrastructure. Our team deployed "
            "new machine learning models using Python and TensorFlow. "
            "Revenue grew 23% year-over-year. The CEO announced a strategic "
            "partnership with Google Cloud."
        ),
        "Strategy_Overview.txt": (
            "Strategic Overview 2024. The organization focuses on three pillars: "
            "AI integration, cloud migration, and talent development. "
            "Dr. Sarah Johnson leads the technology division. "
            "Anthropic developed Claude which competes with OpenAI GPT models. "
            "We plan to implement Kubernetes and Docker for our infrastructure."
        ),
        "Meeting_Notes_March.txt": (
            "Meeting Notes - March 15, 2024. Attendees: John Smith, Mary Williams. "
            "Discussed: React frontend migration, FastAPI backend optimization. "
            "Amazon acquired a startup in the AI space. "
            "Action items: Deploy Redis caching layer, implement GraphQL API. "
            "Next meeting in San Francisco office."
        ),
    }
    return mock_contents.get(filename, f"Sample content for {filename}. This is a demonstration document.")


# ─────────────────────────────────────────────
# MAIN INGESTION PIPELINE
# ─────────────────────────────────────────────
def ingest_from_drive(
    folder_id: str,
    upload_folder: str,
) -> Tuple[List[str], Dict[str, str]]:
    """
    Full ingestion pipeline:
    1. List files in folder
    2. Download each file as text
    3. Save to upload_folder (same dir as manual uploads)
    4. Return (file_names, {filename: text}) for pipeline reuse

    Args:
        folder_id:     Google Drive folder ID
        upload_folder: Path to the existing uploads/ directory

    Returns:
        Tuple of (saved_file_names, {filename: text_content})
    """
    os.makedirs(upload_folder, exist_ok=True)

    files = list_drive_files(folder_id)
    saved_names: List[str] = []
    texts: Dict[str, str] = {}

    for f in files:
        file_id   = f["id"]
        file_name = f["name"]
        mime_type = f["mimeType"]

        # Normalise filename to .txt
        base = os.path.splitext(file_name)[0]
        save_name = f"drive_{base}.txt"

        text = download_file_as_text(file_id, mime_type, file_name)
        if not text or not text.strip():
            continue

        save_path = os.path.join(upload_folder, save_name)
        with open(save_path, "w", encoding="utf-8") as out:
            out.write(text)

        saved_names.append(save_name)
        texts[save_name] = text

    return saved_names, texts


def get_drive_status() -> Dict[str, Any]:
    """Return authentication status for Drive ingestion."""
    has_sa  = bool(os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON"))
    has_key = bool(os.environ.get("GOOGLE_API_KEY"))
    service = _get_drive_service()

    return {
        "authenticated":          service is not None,
        "mode":                   "service_account" if has_sa else ("api_key" if has_key else "simulation"),
        "has_service_account":    has_sa,
        "has_api_key":            has_key,
        "simulation_mode":        service is None,
    }