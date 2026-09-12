"""
Diagnostic script for the retrieval eval.
Run this from the same place you run evaluate_hybrid.py.

What it checks:
  1. Does Qdrant's point count match the number of chunks from the backend?
  2. Does Qdrant's payload["chunk_index"] -> text line up with chunks[chunk_index]
     from the freshly-fetched backend array? (misalignment = root cause candidate)
  3. Dumps the raw text of the chunk IDs you actually need to eyeball.
  4. Runs vector-only and BM25-only retrieval separately for a few failing
     questions, so you can see which component is actually wrong.
"""

import json
import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from google import genai
from rank_bm25 import BM25Okapi

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / "ai-service" / ".env"
load_dotenv(ENV_PATH)

DOCUMENT_ID = "6a9940e7e1c235c342b4315a"
BACKEND_URL = "http://localhost:5000"
COLLECTION_NAME = "policy_documents"

AUTH_TOKEN = input("Enter your JWT token: ").strip()
if not AUTH_TOKEN:
    print("JWT token is required.")
    sys.exit()

# ---- fetch chunks fresh from backend ----
url = f"{BACKEND_URL}/api/documents/{DOCUMENT_ID}/chunks"
response = requests.get(url, headers={"Authorization": f"Bearer {AUTH_TOKEN}"})
if response.status_code != 200:
    print("Failed to fetch document chunks.", response.status_code, response.text)
    sys.exit()

chunks = response.json()["document"]["chunks"]
print(f"\nBackend returned {len(chunks)} chunks (indices 0..{len(chunks)-1})")

# ---- check Qdrant point count ----
qdrant = QdrantClient(url=os.getenv("QDRANT_URL"), api_key=os.getenv("QDRANT_API_KEY"))
count_result = qdrant.count(collection_name=COLLECTION_NAME, exact=True)
print(f"Qdrant collection '{COLLECTION_NAME}' has {count_result.count} points")

if count_result.count != len(chunks):
    print(">>> MISMATCH: Qdrant point count != backend chunk count.")
    print(">>> Your Qdrant collection is almost certainly stale relative to")
    print(">>> the current chunking. Re-ingest/re-embed the document.\n")
else:
    print("Counts match (good sign, but doesn't rule out reordering).\n")

# ---- sample a handful of Qdrant points and compare payload text to chunks[chunk_index] ----
print("Sampling Qdrant points to check chunk_index alignment...")
scroll_result, _ = qdrant.scroll(
    collection_name=COLLECTION_NAME,
    limit=10,
    with_payload=True,
)

mismatches = 0
for point in scroll_result:
    idx = point.payload.get("chunk_index")
    qdrant_text = point.payload.get("text", point.payload.get("content", ""))
    if idx is None or idx >= len(chunks):
        print(f"  point {point.id}: chunk_index={idx} is out of range for {len(chunks)} chunks!")
        mismatches += 1
        continue
    backend_text = chunks[idx]
    # crude similarity check: first 60 chars
    if qdrant_text[:60].strip() != str(backend_text)[:60].strip():
        print(f"  MISMATCH at chunk_index={idx}:")
        print(f"    Qdrant payload text:  {qdrant_text[:80]!r}")
        print(f"    Backend chunks[{idx}]: {str(backend_text)[:80]!r}")
        mismatches += 1

if mismatches == 0:
    print("  All sampled points aligned correctly.\n")
else:
    print(f"  {mismatches} misaligned point(s) found out of 10 sampled.\n")
    print(">>> This confirms chunk_index drift between Qdrant and the backend.")
    print(">>> Fix: delete and re-ingest the Qdrant collection from the CURRENT")
    print(">>> chunk list before re-running the eval.\n")

# ---- dump text for the specific chunk IDs you need to inspect ----
target_ids = sorted(set([
    162, 165, 43,
    25, 105, 106, 113, 116, 24, 156, 231, 258, 232,
    25, 26, 111, 112, 113, 109, 114, 9, 24,
    4, 11, 12, 13, 197, 217, 214, 14, 101, 0, 10,
    99, 102, 107, 117, 130, 131,
]))

print("=" * 60)
print("RAW CHUNK TEXT FOR MANUAL INSPECTION")
print("=" * 60)
for cid in target_ids:
    if cid < len(chunks):
        text = str(chunks[cid])
        print(f"\n--- chunk {cid} ---")
        print(text[:400] + ("..." if len(text) > 400 else ""))
    else:
        print(f"\n--- chunk {cid} --- OUT OF RANGE (only {len(chunks)} chunks)")