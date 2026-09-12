import os
from collections import Counter

from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue


# -------------------------
# Load environment
# -------------------------

load_dotenv(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "ai-service",
        ".env"
    )
)


COLLECTION_NAME = "policy_documents"

DOCUMENT_ID = "6a9bbad0d9e733633c002d03"


# -------------------------
# Qdrant
# -------------------------

qdrant = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY"),
)


# -------------------------
# Get all points
# -------------------------

points = []

offset = None

while True:

    result = qdrant.scroll(
        collection_name=COLLECTION_NAME,

        scroll_filter=Filter(
            must=[
                FieldCondition(
                    key="document_id",
                    match=MatchValue(
                        value=DOCUMENT_ID
                    ),
                )
            ]
        ),

        limit=100,
        offset=offset,
        with_payload=True,
        with_vectors=False,
    )

    batch, offset = result

    points.extend(batch)

    if offset is None:
        break


# -------------------------
# Analyze chunk indexes
# -------------------------

chunk_indexes = [
    point.payload.get("chunk_index")
    for point in points
]

counter = Counter(chunk_indexes)

duplicates = {
    chunk_index: count
    for chunk_index, count in counter.items()
    if count > 1
}


# -------------------------
# Results
# -------------------------

print("\n==============================")
print("QDRANT DOCUMENT CHECK")
print("==============================")

print(
    "Document ID:",
    DOCUMENT_ID
)

print(
    "Total Qdrant points:",
    len(points)
)

print(
    "Unique chunk indexes:",
    len(set(chunk_indexes))
)

print(
    "Expected chunks:",
    256
)

print(
    "Duplicate chunk indexes:",
    len(duplicates)
)


if duplicates:

    print("\n==============================")
    print("DUPLICATES")
    print("==============================")

    for chunk_index, count in sorted(
        duplicates.items()
    ):

        print(
            f"Chunk {chunk_index}: "
            f"{count} copies"
        )

else:

    print(
        "\nNo duplicate chunk indexes found."
    )


print("\n==============================")
print("STATUS")
print("==============================")

if (
    len(points) == 256
    and len(set(chunk_indexes)) == 256
    and not duplicates
):

    print(
        "Qdrant data looks correct."
    )

else:

    print(
        "Qdrant contains duplicate or "
        "unexpected chunk data."
    )