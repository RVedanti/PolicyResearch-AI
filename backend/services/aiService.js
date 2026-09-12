const axios = require("axios");

const AI_SERVICE_URL = "http://127.0.0.1:8000";

const createEmbeddings = async (texts) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/embed`,
      { texts }
    );

    return response.data;
  } catch (error) {
    console.error(
      "AI service error:",
      error.response?.data || error.message
    );

    throw new Error("Failed to generate embeddings");
  }
};

const askRAG = async (question, jwtToken, documentId) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/rag`,
{
  question,
  jwt_token: jwtToken,
  document_id: documentId,
}
    );

    return response.data;
  } catch (error) {
    console.error(
      "RAG service error:",
      error.response?.data || error.message
    );

    throw new Error("Failed to generate RAG answer");
  }
};

module.exports = {
  createEmbeddings,
  askRAG,
};