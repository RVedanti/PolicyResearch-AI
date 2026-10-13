import os
import requests

from dotenv import load_dotenv
from google import genai


load_dotenv()


BACKEND_URL = "http://localhost:5000"

DOCUMENT_ID = "6a9940e7e1c235c342b4315a"

# Put your fresh JWT here.
AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTk4MTY2M2Q5ZTlhYjRhZGNmMTU5YmYiLCJpYXQiOjE3ODg0OTc4ODAsImV4cCI6MTc4OTEwMjY4MH0.L2A75SCLtVcvSOguNPJVej4bDtMV6cTypQE9Rawqg5g"


gemini = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


def get_document_chunks():

    url = (
        f"{BACKEND_URL}/api/documents/"
        f"{DOCUMENT_ID}/chunks"
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
            f"Failed to fetch chunks: "
            f"{response.status_code}"
        )

    data = response.json()

    return data["document"]["chunks"]


def prepare_context(chunks, max_chunks=30):

    selected_chunks = chunks[:max_chunks]

    context_parts = []

    for index, chunk in enumerate(
        selected_chunks
    ):

        context_parts.append(
            f"[Chunk {index}]\n{chunk}"
        )

    return "\n\n".join(context_parts)


def extract_evidence(
    claim,
    context
):

    prompt = f"""
You are an AI research assistant
helping researchers analyze policy
documents.

Determine whether the provided
document evidence supports the
research claim.

Use ONLY the provided document
context.

Do not use outside knowledge.
Do not invent evidence.

Research Claim:
{claim}

Document Context:
{context}

Provide your response using exactly
these sections:

1. Claim Assessment
- State whether the evidence
  supports, partially supports,
  or does not support the claim.

2. Supporting Evidence
- Identify the strongest evidence
  from the document.
- Cite the relevant chunk using
  [Chunk X].

3. Explanation
- Briefly explain how the evidence
  relates to the claim.

4. Evidence Limitations
- Mention any limitations,
  uncertainty, or missing evidence.

Every factual statement must be
supported by a chunk citation.
"""

    response = gemini.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    return response.text


if __name__ == "__main__":

    claim = input(
        "Enter a research claim: "
    ).strip()

    if not claim:
        print("Claim cannot be empty.")
        exit()

    print("\nFetching document chunks...")

    chunks = get_document_chunks()

    print(
        f"Loaded {len(chunks)} chunks."
    )

    print("\nPreparing evidence context...")

    context = prepare_context(chunks)

    print("Generating evidence analysis...")

    result = extract_evidence(
        claim,
        context
    )

    print("\n================================")
    print("EVIDENCE EXTRACTION")
    print("================================")

    print(result)