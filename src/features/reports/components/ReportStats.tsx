import { Activity, AlertTriangle, Check, ClipboardList } from "lucide-react";
import type { Stats } from "../../../types";

export function ReportStats({ stats }: { stats: Stats }) {
  return (
    <div className="stats-grid">
      <div className="stat-card coral">
        <span>
          <ClipboardList />
        </span>
        <div>
          <small>Заявок за период</small>
          <strong>{stats.total}</strong>
        </div>
      </div>
      <div className="stat-card amber">
        <span>
          <AlertTriangle />
        </span>
        <div>
          <small>Просрочено</small>
          <strong>{stats.overdue}</strong>
        </div>
      </div>
      <div className="stat-card green">
        <span>
          <Check />
        </span>
        <div>
          <small>Выполнено</small>
          <strong>{stats.completed}</strong>
        </div>
      </div>
      <div className="stat-card violet">
        <span>
          <Activity />
        </span>
        <div>
          <small>Среднее выполнение</small>
          <strong>{stats.averageResolutionHours} ч</strong>
        </div>
      </div>
    </div>
  );
}
