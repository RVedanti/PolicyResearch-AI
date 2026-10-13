import { useEffect, useState } from "react";
import { api } from "../api";

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);

  // If signing in takes a while, the free server is probably waking up.
  useEffect(() => {
    if (!loading) return undefined;
    const timer = setTimeout(() => setSlow(true), 5000);
    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [loading]);

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
            {loading ? (slow ? "Waking up the server…" : "Signing in…") : "Sign in"}
          </button>

          {slow && (
            <p className="login-wait" role="status">
              The server was asleep. This first sign-in can take up to a minute.
            </p>
          )}
        </form>

        <p className="login-note">
          <strong>Note:</strong> this demo runs on free hosting that sleeps when nobody is
          using it. The first sign-in and first answer may take up to a minute; after that
          it’s fast.
        </p>

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
