import requests
from rank_bm25 import BM25Okapi


BACKEND_URL = "http://localhost:5000"
DOCUMENT_ID = "6a9940e7e1c235c342b4315a"
AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTk4MTY2M2Q5ZTlhYjRhZGNmMTU5YmYiLCJpYXQiOjE3ODg0OTc4ODAsImV4cCI6MTc4OTEwMjY4MH0.L2A75SCLtVcvSOguNPJVej4bDtMV6cTypQE9Rawqg5g"

def get_document_chunks():
    url = f"{BACKEND_URL}/api/documents/{DOCUMENT_ID}/chunks"

    headers = {
        "Authorization": f"Bearer {AUTH_TOKEN}"
    }

    response = requests.get(
        url,
        headers=headers
    )

    if response.status_code != 200:
        raise Exception(
            f"Failed to fetch chunks: {response.status_code}"
        )

    data = response.json()

    return data["document"]["chunks"]

def tokenize(text):
    return text.lower().split()


def build_bm25(chunks):
    tokenized_chunks = [
        tokenize(chunk)
        for chunk in chunks
    ]

    return BM25Okapi(tokenized_chunks)


def search_bm25(bm25, chunks, question, limit=5):
    query_tokens = tokenize(question)

    scores = bm25.get_scores(query_tokens)

    ranked_indexes = sorted(
        range(len(scores)),
        key=lambda i: scores[i],
        reverse=True
    )

    results = []

    for index in ranked_indexes[:limit]:
        results.append({
            "chunk_index": index,
            "score": float(scores[index]),
            "text": chunks[index],
        })

    return results


if __name__ == "__main__":

    question = input("Enter your question: ").strip()

    if not question:
        print("Question cannot be empty.")
        exit()

    print("\nFetching document chunks...")

    chunks = get_document_chunks()

    print(f"Loaded {len(chunks)} chunks.")

    print("\nBuilding BM25 index...")

    bm25 = build_bm25(chunks)

    print("BM25 index created.")

    print("\nSearching...")

    results = search_bm25(
        bm25,
        chunks,
        question,
        limit=5
    )

    print("\n================================")
    print("BM25 SEARCH RESULTS")
    print("================================")

    for i, result in enumerate(results, start=1):

        print(f"\nResult {i}")
        print("Chunk Index:", result["chunk_index"])
        print("Score:", round(result["score"], 4))
        print("Text:")
        print(result["text"][:500])