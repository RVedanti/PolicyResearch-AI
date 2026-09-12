import requests

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

print(f"\nLoaded {len(chunks)} chunks.")

while True:
    keyword = input(
        "\nEnter keyword to search "
        "(or type 'q' to quit): "
    ).strip().lower()

    if keyword == "q":
        break

    if not keyword:
        print("Please enter a keyword.")
        continue

    matches = []

    for index, chunk in enumerate(chunks):
        if keyword in chunk.lower():
            matches.append((index, chunk))

    print(f"\nFound {len(matches)} matching chunks.")

    for index, chunk in matches[:10]:
        print("\n================================")
        print(f"CHUNK {index}")
        print("================================")
        print(chunk[:1000])

    if len(matches) > 10:
        print(f"\nShowing first 10 of {len(matches)} matches.")