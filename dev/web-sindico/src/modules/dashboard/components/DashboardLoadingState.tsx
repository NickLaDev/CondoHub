export function DashboardLoadingState() {
  return (
    <div className="dashboard-loading">
      <div className="dashboard-loading__metrics">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="skeleton skeleton--card" />
        ))}
      </div>

      <div className="dashboard-loading__panels">
        <div className="skeleton skeleton--panel" />
        <div className="skeleton skeleton--panel" />
      </div>

      <div className="skeleton skeleton--panel skeleton--logs" />
    </div>
  );
}
