const axios = require("axios");

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL ||
  "http://127.0.0.1:8000";

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

// Turn an axios error into a message that says what actually went wrong.
const describeAIServiceError = (error) => {
  if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
    return `Cannot reach the AI service at ${AI_SERVICE_URL}. Check that it is running and that AI_SERVICE_URL is set correctly.`;
  }
  if (error.code === "ECONNABORTED") {
    return "The AI service took too long to respond. If it was asleep, wait a minute and try again.";
  }
  if (error.response) {
    const detail =
      error.response.data?.message ||
      error.response.data?.detail ||
      error.response.statusText;
    return `AI service error (HTTP ${error.response.status})${detail ? `: ${typeof detail === "string" ? detail : JSON.stringify(detail)}` : ""}`;
  }
  return `Could not get an answer from the AI service: ${error.message}`;
};

const askRAG = async (question, jwtToken, documentId) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/rag`,
      {
        question,
        jwt_token: jwtToken,
        document_id: documentId,
      },
      // Long enough for a sleeping free-tier service to wake up.
      { timeout: 120000 }
    );

    return response.data;
  } catch (error) {
    console.error(
      "RAG service error:",
      error.response?.data || error.message
    );

    throw new Error(describeAIServiceError(error));
  }
};

module.exports = {
  createEmbeddings,
  askRAG,
};