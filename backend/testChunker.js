const chunkText = require("./utils/textChunker");

const text = `
Artificial intelligence is transforming education.
AI-based systems can provide personalized learning.
Students can receive feedback based on their performance.
Teachers can use AI to analyze student progress.
Policy makers are also exploring the use of AI in education.
`;

const chunks = chunkText(text, 20, 5);

console.log("Number of chunks:", chunks.length);

chunks.forEach((chunk, index) => {
  console.log(`\n--- Chunk ${index + 1} ---`);
  console.log(chunk);
});