import { useState } from "react";
import { api } from "../api";

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: { email, password },
      });

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="login-panel">
        <span className="wordmark">
          Policy<em>Research</em>
        </span>

        <div className="login-heading">
          <p className="eyebrow">From documents to decisions</p>
          <h1>Welcome back</h1>
          <p className="login-sub">Sign in to continue your policy research.</p>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="button button-primary button-block" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

      </div>

      <aside className="login-feature" aria-label="About PolicyResearch">
        <p className="eyebrow">How it works</p>
        <h2>
          Read less. <em>Understand more.</em>
        </h2>
        <ol className="login-steps">
          <li>
            <span>01</span>
            <div>
              <strong>Upload your policy PDFs</strong>
              <p>Organise them into projects. Every page is indexed for search.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Ask in plain language</strong>
              <p>The assistant finds the passages that matter most to your question.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Check every claim</strong>
              <p>Answers cite their sources, so you can read the original text.</p>
            </div>
          </li>
        </ol>
      </aside>
    </div>
  );
}
