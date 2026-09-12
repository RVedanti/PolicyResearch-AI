import os
import uuid
from collections import defaultdict

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


# -------------------------
# Configuration
# -------------------------

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

    batch, offset = qdrant.scroll(
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

    points.extend(batch)

    if offset is None:
        break


print("\n==============================")
print("QDRANT CLEANUP")
print("==============================")

print(
    "Document ID:",
    DOCUMENT_ID
)

print(
    "Points before cleanup:",
    len(points)
)


# -------------------------
# Group points by chunk index
# -------------------------

points_by_chunk = defaultdict(list)

for point in points:

    chunk_index = point.payload.get(
        "chunk_index"
    )

    points_by_chunk[chunk_index].append(
        point
    )


# -------------------------
# Determine points to delete
# -------------------------

points_to_delete = []

points_to_keep = []


for chunk_index, chunk_points in sorted(
    points_by_chunk.items()
):

    expected_id = str(
        uuid.uuid5(
            uuid.NAMESPACE_URL,
            f"{DOCUMENT_ID}_{chunk_index}"
        )
    )

    # Prefer the deterministic UUID
    deterministic_point = next(
        (
            point
            for point in chunk_points
            if str(point.id) == expected_id
        ),
        None
    )

    if deterministic_point:

        keep = deterministic_point

    else:

        # Fallback: keep first point
        keep = chunk_points[0]

    points_to_keep.append(keep)

    # Delete all other copies
    for point in chunk_points:

        if point.id != keep.id:

            points_to_delete.append(
                point.id
            )


# -------------------------
# Show cleanup plan
# -------------------------

print(
    "Unique chunks:",
    len(points_to_keep)
)

print(
    "Duplicate points to delete:",
    len(points_to_delete)
)


if not points_to_delete:

    print(
        "\nNo duplicate points found."
    )

    raise SystemExit


# -------------------------
# Delete duplicates
# -------------------------

print(
    "\nDeleting duplicate points..."
)

qdrant.delete(
    collection_name=COLLECTION_NAME,
    points_selector=points_to_delete,
)


print(
    "Deleted:",
    len(points_to_delete)
)


# -------------------------
# Verify
# -------------------------

remaining_points = []

offset = None

while True:

    batch, offset = qdrant.scroll(
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

    remaining_points.extend(batch)

    if offset is None:
        break


remaining_chunk_indexes = [
    point.payload.get("chunk_index")
    for point in remaining_points
]


print("\n==============================")
print("CLEANUP COMPLETE")
print("==============================")

print(
    "Points after cleanup:",
    len(remaining_points)
)

print(
    "Unique chunk indexes:",
    len(set(remaining_chunk_indexes))
)

print(
    "Expected:",
    256
)


if (
    len(remaining_points) == 256
    and len(set(remaining_chunk_indexes)) == 256
):

    print(
        "\nSUCCESS: Qdrant is clean."
    )

else:

    print(
        "\nWARNING: Qdrant still needs inspection."
    )