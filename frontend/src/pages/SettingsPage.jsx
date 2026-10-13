export default function SettingsPage({ user, onLogout }) {
  const initial = user?.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="page page-narrow">
      <header className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Your profile and app information.</p>
        </div>
      </header>

      <section className="card">
        <div className="profile">
          <div className="avatar avatar-lg">{initial}</div>
          <div>
            <h2>{user?.name || "User"}</h2>
            <p className="muted">{user?.email || "Email not available"}</p>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">About</h2>
        <dl className="details">
          <div>
            <dt>Application</dt>
            <dd>PolicyResearch AI</dd>
          </div>
          <div>
            <dt>Description</dt>
            <dd>AI-powered policy research assistant</dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd>1.0.0</dd>
          </div>
        </dl>
      </section>

      <section className="card card-row">
        <div>
          <h2 className="card-title">Sign out</h2>
          <p className="muted">You will need to sign in again to continue.</p>
        </div>
        <button type="button" className="button button-outline button-danger" onClick={onLogout}>
          Log out
        </button>
      </section>
    </div>
  );
}
