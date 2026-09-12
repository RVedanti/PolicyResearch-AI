import os
import json
import requests
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / "ai-service" / ".env"

load_dotenv(ENV_FILE)

DOCUMENT_ID = "6a9bbad0d9e733633c002d03"
BACKEND_URL = "http://localhost:5000"

auth_token = os.getenv("AUTH_TOKEN")

if not auth_token:
    print("AUTH_TOKEN is not set in .env")
    raise SystemExit(1)

print("Fetching current document chunks...")

response = requests.get(
    f"{BACKEND_URL}/api/documents/{DOCUMENT_ID}/chunks",
    headers={
        "Authorization": f"Bearer {auth_token}"
    }
)

print("Status:", response.status_code)

if response.status_code != 200:
    print(response.text)
    raise SystemExit(1)

data = response.json()
chunks = data["document"]["chunks"]

print("Total chunks:", len(chunks))

output = []

for index, chunk in enumerate(chunks):
    if isinstance(chunk, dict):
        text = chunk.get("text", "")
    else:
        text = str(chunk)

    output.append({
        "chunk_id": index,
        "text": text
    })

output_file = Path(__file__).parent / "current_chunks.json"

with open(output_file, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print()
print("================================")
print("Current chunks exported!")
print("File:", output_file)
print("Total:", len(output))
print("================================")