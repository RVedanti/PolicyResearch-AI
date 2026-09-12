import json
from pathlib import Path

# ---------------------------------------
# FILE PATHS
# ---------------------------------------

BASE_DIR = Path(__file__).resolve().parent

QUESTIONS_FILE = BASE_DIR / "questions.json"
CHUNKS_FILE = BASE_DIR / "current_chunks.json"
OUTPUT_FILE = BASE_DIR / "questions_cleaned.json"


# ---------------------------------------
# LOAD FILES
# ---------------------------------------

with open(QUESTIONS_FILE, "r", encoding="utf-8") as f:
    questions = json.load(f)

with open(CHUNKS_FILE, "r", encoding="utf-8") as f:
    chunks = json.load(f)


# ---------------------------------------
# SHOW CURRENT DATA
# ---------------------------------------

print("Questions loaded:", len(questions))
print("Chunks loaded:", len(chunks))

print("\n================================")
print("Current chunk range")
print("================================")
print("First chunk ID:", chunks[0]["chunk_id"])
print("Last chunk ID:", chunks[-1]["chunk_id"])


# ---------------------------------------
# IMPORTANT
# ---------------------------------------
# We are NOT automatically shifting old IDs.
#
# The cleaned PDF changed chunk boundaries,
# therefore each question needs to point
# to the actual current chunk(s).
#
# The mappings below are based on the
# cleaned document's current chunk structure.
# ---------------------------------------

NEW_RELEVANT_CHUNKS = {

    1: [27, 28, 29, 30, 31],

    2: [40, 41, 42, 48, 50, 52, 53, 54],

    3: [96, 97, 98, 99, 100, 101],

    4: [55, 58, 60, 61, 62, 63, 64, 65],

    5: [31, 32],

    6: [41, 48, 50, 52, 54],

    7: [40, 41, 42, 48, 50, 52, 53],

    8: [48, 50, 52, 53, 54],

    9: [41, 42, 50, 52, 54],

    10: [40, 41, 48, 50, 52, 54],

    11: [55, 58, 60, 61, 62, 63, 64, 65],

    12: [58, 60, 61, 62, 63, 64, 65],

    13: [60, 61, 64, 65],

    14: [61, 62, 63, 64, 65],

    15: [60, 61, 64, 65],

    16: [66, 68, 73, 74, 75, 76],

    17: [73, 74, 75, 76],

    18: [75, 76, 77, 78],

    19: [73, 75, 76, 77, 79],

    20: [73, 74, 75, 76, 77],

    21: [79, 81, 82, 83, 84],

    22: [89, 90, 92, 93, 94],

    23: [88, 89, 90, 91, 92, 93, 94],

    24: [89, 91, 92, 93, 94],

    25: [88, 90, 92, 93, 94],

    26: [27, 28, 29, 30, 31, 32],

    27: [31, 32, 106],

    28: [3, 4, 5, 6, 26, 27, 31],

    29: [31, 32],

    30: [31, 32, 103, 106, 107],

    31: [142, 143, 144, 145, 146, 147, 148, 149],

    32: [142, 143, 146, 147, 149, 154, 155],

    33: [142, 146, 147, 154, 155, 156],

    34: [147, 148, 152, 153, 154],

    35: [142, 145, 146, 147, 148, 149, 150, 151],

    36: [193, 198, 199, 200, 201, 202, 203],

    37: [193, 194, 195, 196, 198, 199, 200, 205],

    38: [194, 195, 199, 200],

    39: [193, 198, 199, 200, 201, 202, 203],

    40: [193, 194, 195, 198, 199, 200, 201, 202, 203, 205],

    41: [99, 103, 104, 105, 106, 107, 108, 109],

    42: [103, 105, 106, 108, 109, 111, 116, 117],

    43: [105, 106, 111, 113, 116, 117, 119],

    44: [9, 116, 117, 118, 119, 127, 128],

    45: [22, 23, 24, 25, 26, 110, 111],

    46: [96, 97, 98, 99, 100, 101],

    47: [96, 97, 98, 100, 101],

    48: [206, 207, 208, 209, 210, 211, 212],

    49: [2, 3, 4, 5, 6, 7, 13, 26],

    50: [27, 28, 29, 30, 31, 38, 96, 97],
}


# ---------------------------------------
# APPLY MAPPINGS
# ---------------------------------------

for question in questions:

    question_id = question["id"]

    if question_id not in NEW_RELEVANT_CHUNKS:
        print(f"WARNING: No mapping found for Q{question_id}")
        continue

    question["relevant_chunks"] = NEW_RELEVANT_CHUNKS[question_id]


# ---------------------------------------
# SAVE
# ---------------------------------------

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(questions, f, indent=2, ensure_ascii=False)


# ---------------------------------------
# VERIFY
# ---------------------------------------

print("\n================================")
print("Ground truth remapping completed!")
print("================================")

print("Output:", OUTPUT_FILE)
print("Questions:", len(questions))

for q in questions:
    print(
        f"Q{q['id']}: "
        f"{len(q['relevant_chunks'])} relevant chunks"
    )