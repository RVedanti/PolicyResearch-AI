import os
import requests

from dotenv import load_dotenv

load_dotenv()

DOCUMENT_ID = "6a9940e7e1c235c342b4315a"
BACKEND_URL = "http://localhost:5000"

AUTH_TOKEN = input("Enter your JWT token: ").strip()

url = f"{BACKEND_URL}/api/documents/{DOCUMENT_ID}/chunks"

response = requests.get(
    url,
    headers={
        "Authorization": f"Bearer {AUTH_TOKEN}"
    },
)

if response.status_code != 200:
    print("Failed to fetch chunks.")
    print("Status:", response.status_code)
    print(response.text)
    exit()

data = response.json()

chunks = data["document"]["chunks"]

print(f"\nTotal chunks: {len(chunks)}")

while True:
    value = input(
        "\nEnter chunk number to inspect "
        "(or type 'q' to quit): "
    ).strip()

    if value.lower() == "q":
        break

    if not value.isdigit():
        print("Please enter a valid chunk number.")
        continue

    index = int(value)

    if index < 0 or index >= len(chunks):
        print("Chunk number out of range.")
        continue

    print("\n================================")
    print(f"CHUNK {index}")
    print("================================")
    print(chunks[index])