import { useEffect, useState } from "react";

function App() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5000/api/health")
      .then((response) => response.json())
      .then((data) => {
        setMessage(data.message);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error connecting to backend:", error);
        setMessage("Unable to connect to backend");
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h1>PolicyResearch AI</h1>

      <p>AI-powered research and policy intelligence platform</p>

      <hr />

      <h2>Backend Status</h2>

      {loading ? (
        <p>Connecting to backend...</p>
      ) : (
        <p>{message}</p>
      )}
    </div>
  );
}

export default App;