const chunkText = (text, chunkSize = 150, overlap = 50) => {
  const words = text.split(/\s+/);

  const chunks = [];

  let start = 0;

  while (start < words.length) {
    const chunkWords = words.slice(start, start + chunkSize);

    const chunk = chunkWords.join(" ").trim();

    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    start += chunkSize - overlap;
  }

  return chunks;
};

module.exports = chunkText;