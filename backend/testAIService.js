const { createEmbeddings } = require("./services/aiService");

const test = async () => {
  try {
    const texts = [
      "Artificial intelligence is transforming education.",
      "AI can help governments develop better policies.",
      "Machine learning is being used in healthcare.",
    ];

    console.log("Sending texts to AI service...");

    const result = await createEmbeddings(texts);

    console.log("Success!");
    console.log("Number of embeddings:", result.count);
    console.log("Embedding dimensions:", result.dimensions);
  } catch (error) {
    console.error("Test failed:", error.message);
  }
};

test();