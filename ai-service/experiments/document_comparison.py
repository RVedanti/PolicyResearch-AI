import os
import requests

from dotenv import load_dotenv
from google import genai


load_dotenv()


BACKEND_URL = "http://localhost:5000"

# Your existing document
DOCUMENT_A_ID = "6a9940e7e1c235c342b4315a"

# We will temporarily use the same document for testing.
# Later this will be replaced with a second document.
DOCUMENT_B_ID = "6a9940e7e1c235c342b4315a"

# Put your fresh JWT here.
AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTk4MTY2M2Q5ZTlhYjRhZGNmMTU5YmYiLCJpYXQiOjE3ODg0OTc4ODAsImV4cCI6MTc4OTEwMjY4MH0.L2A75SCLtVcvSOguNPJVej4bDtMV6cTypQE9Rawqg5g"


gemini = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


def get_document_chunks(document_id):

    url = (
        f"{BACKEND_URL}/api/documents/"
        f"{document_id}/chunks"
    )

    headers = {
        "Authorization": f"Bearer {AUTH_TOKEN}"
    }

    response = requests.get(
        url,
        headers=headers
    )

    if response.status_code != 200:
        raise Exception(
            f"Failed to fetch document "
            f"{document_id}: "
            f"{response.status_code}"
        )

    data = response.json()

    return data["document"]["chunks"]


def prepare_document_text(chunks, max_chunks=20):

    selected_chunks = chunks[:max_chunks]

    parts = []

    for index, chunk in enumerate(
        selected_chunks
    ):
        parts.append(
            f"[Chunk {index}]\n{chunk}"
        )

    return "\n\n".join(parts)


def compare_documents(
    document_a_text,
    document_b_text
):

    prompt = f"""
You are an AI research assistant
specializing in policy analysis.

Compare the two provided policy documents.

Use ONLY the information provided
in the documents.

Do not use outside knowledge.
Do not invent facts.

Document A:
{document_a_text}

Document B:
{document_b_text}

Provide the comparison using exactly
these sections:

1. Similarities
- Identify the major concepts,
  objectives, or themes shared
  by both documents.

2. Differences
- Identify important differences
  between the documents.

3. Key Themes
- Summarize the major policy themes
  found across the documents.

4. Important Observations
- Give concise research-oriented
  observations based only on the
  provided content.

Keep the response clear and concise.
"""

    response = gemini.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    return response.text


if __name__ == "__main__":

    print("Fetching Document A...")

    chunks_a = get_document_chunks(
        DOCUMENT_A_ID
    )

    print(
        f"Document A chunks: "
        f"{len(chunks_a)}"
    )

    print("\nFetching Document B...")

    chunks_b = get_document_chunks(
        DOCUMENT_B_ID
    )

    print(
        f"Document B chunks: "
        f"{len(chunks_b)}"
    )

    print("\nPreparing document text...")

    text_a = prepare_document_text(
        chunks_a
    )

    text_b = prepare_document_text(
        chunks_b
    )

    print("Generating comparison...")

    result = compare_documents(
        text_a,
        text_b
    )

    print("\n================================")
    print("DOCUMENT COMPARISON")
    print("================================")

    print(result)