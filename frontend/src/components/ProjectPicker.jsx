import Icon from "./Icon";

export default function ProjectPicker({
  projects,
  loading,
  value,
  onChange,
  onNewProject,
}) {
  return (
    <div className="picker">
      <label className="picker-field">
        <Icon name="folder" size={16} />
        <span className="sr-only">Project</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading}
        >
          {loading ? (
            <option value="">Loading projects…</option>
          ) : projects.length === 0 ? (
            <option value="">No projects yet</option>
          ) : (
            <>
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.title}
                </option>
              ))}
            </>
          )}
        </select>
      </label>

      <button
        type="button"
        className="button button-soft button-sm"
        onClick={onNewProject}
      >
        <Icon name="plus" size={16} strokeWidth={2.4} />
        New project
      </button>
    </div>
  );
}
