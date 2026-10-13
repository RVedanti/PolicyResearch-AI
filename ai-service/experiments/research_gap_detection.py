import os
import requests

from dotenv import load_dotenv
from google import genai


load_dotenv()


BACKEND_URL = "http://localhost:5000"

DOCUMENT_ID = "6a9940e7e1c235c342b4315a"

# Put your fresh JWT here.
AUTH_TOKEN ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTk4MTY2M2Q5ZTlhYjRhZGNmMTU5YmYiLCJpYXQiOjE3ODg0OTc4ODAsImV4cCI6MTc4OTEwMjY4MH0.L2A75SCLtVcvSOguNPJVej4bDtMV6cTypQE9Rawqg5g"

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


def detect_research_gaps(context):

    prompt = f"""
You are an AI research assistant
specializing in policy analysis.

Analyze the provided policy document
and identify potential research gaps.

Use ONLY the provided document context.

Do not use outside knowledge.
Do not invent information.

A research gap may include:
- An important topic that receives
  limited discussion.
- An issue mentioned but not explored
  in sufficient detail.
- An area where evidence appears
  limited in the provided content.
- A question that the document raises
  but does not adequately answer.

Do NOT claim that a topic is completely
absent unless the provided context
clearly supports that conclusion.

Document Context:
{context}

Provide your response using exactly
these sections:

1. Major Topics Covered
- Briefly identify the main areas
  discussed in the document.

2. Potential Research Gaps
For each potential gap provide:
- Gap
- Why it appears to be a gap
- Supporting chunk citation [Chunk X]

3. Research Questions
- Suggest research questions that
  could investigate the identified gaps.

4. Limitations
- Clearly explain that the analysis
  is based only on the provided
  document context.

Keep the analysis concise and
research-oriented.

Every factual statement about the
document must include a chunk citation.
"""

    response = gemini.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    return response.text


if __name__ == "__main__":

    print("Fetching document chunks...")

    chunks = get_document_chunks()

    print(
        f"Loaded {len(chunks)} chunks."
    )

    print("\nPreparing document context...")

    context = prepare_context(chunks)

    print("Generating research gap analysis...")

    result = detect_research_gaps(context)

    print("\n================================")
    print("RESEARCH GAP ANALYSIS")
    print("================================")

    print(result)