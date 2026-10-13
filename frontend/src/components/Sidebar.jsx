import Icon from "./Icon";

export const PAGES = [
  ["Ask", "chat"],
  ["History", "clock"],
  ["Saved", "bookmark"],
  ["Documents", "file"],
  ["Settings", "settings"],
];

export default function Sidebar({
  activePage,
  onNavigate,
  onLogout,
  user,
  open,
  onClose,
}) {
  return (
    <>
      <div
        className={`sidebar-backdrop ${open ? "is-open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <div className="sidebar-top">
          <span className="wordmark">
            Policy<em>Research</em>
          </span>
          <button
            type="button"
            className="icon-button sidebar-close"
            onClick={onClose}
            aria-label="Close menu"
          >
            <Icon name="close" />
          </button>
        </div>

        <nav className="nav" aria-label="Main">
          {PAGES.map(([name, icon]) => (
            <button
              key={name}
              type="button"
              className={`nav-item ${activePage === name ? "is-active" : ""}`}
              aria-current={activePage === name ? "page" : undefined}
              onClick={() => onNavigate(name)}
            >
              <Icon name={icon} size={17} />
              {name}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="signed-in">
            <span className="avatar" aria-hidden="true">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </span>
            <span className="signed-in-text">
              <strong>{user?.name || "User"}</strong>
              <button type="button" className="link-button" onClick={onLogout}>
                Log out
              </button>
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
