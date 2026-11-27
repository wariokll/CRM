import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ApiError } from "../../../api";
import { queryKeys } from "../../../shared/queryKeys";
import { ErrorState } from "../../../components/ui";
import { getComponents, getReportData } from "../queries";
import { ReportControls } from "../components/ReportControls";
import {
  ProcurementReport,
  RequestsReport,
  reportList,
  sourceLabel,
  statuses,
} from "../components/ReportDataViews";
import { ReportStats } from "../components/ReportStats";

const errorText = (value: unknown) =>
  value instanceof ApiError || value instanceof Error
    ? value.message
    : "Не удалось загрузить отчёт";
const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "—";
export function ReportsPage() {
  const firstDay = () =>
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10);
  const [searchParams, setSearchParams] = useSearchParams();
  const from = searchParams.get("from") ?? firstDay();
  const to = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
  const viewParam = searchParams.get("view");
  const view = (
    ["overview", "clients", "team", "requests", "procurement"].includes(
      viewParam ?? "",
    )
      ? viewParam
      : "overview"
  ) as "overview" | "clients" | "team" | "requests" | "procurement";
  const [componentId, setComponentIdState] = useState(
    searchParams.get("componentId") ?? "",
  );
  useEffect(() => {
    setComponentIdState(searchParams.get("componentId") ?? "");
  }, [searchParams]);
  const setParam = (key: string, value: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  };
  const setView = (value: typeof view) => setParam("view", value);
  const reportQuery = useQuery({
    queryKey: queryKeys.reports.data(from, to, componentId),
    queryFn: () => getReportData(from, to, componentId),
  });
  const componentsQuery = useQuery({
    queryKey: queryKeys.components.all,
    queryFn: getComponents,
  });
  const stats = reportQuery.data?.stats;
  const procurement = reportQuery.data?.procurement ?? [];
  const components = componentsQuery.data ?? [];
  const error = reportQuery.error ? errorText(reportQuery.error) : "";
  return (
    <>
      {error && <ErrorState>{error}</ErrorState>}
      <ReportControls
        from={from}
        to={to}
        view={view}
        componentId={componentId}
        components={components}
        setParam={(key, value) => {
          if (key === "componentId") setComponentIdState(value);
          setParam(key, value);
        }}
        setView={setView}
        setComponentId={(value) => {
          setComponentIdState(value);
          setParam("componentId", value);
        }}
        refetch={() => reportQuery.refetch()}
      />
      {stats && (
        <>
          <ReportStats stats={stats} />
          {view === "overview" && (
            <div className="report-grid">
              {reportList(
                "По статусам",
                stats.byStatus.map((item) => ({
                  id: Object.keys(statuses).indexOf(item.status),
                  name: statuses[item.status],
                  count: item._count._all,
                })),
              )}
              {reportList(
                "По шаблонам",
                stats.byType.map((item) => ({
                  id: item.typeId,
                  name: item.type?.name ?? "Удалённый шаблон",
                  count: item._count._all,
                })),
              )}
              {reportList("По отделам", stats.departments)}
              <section className="panel table-panel">
                <div className="panel-head">
                  <h2>Источники обращений</h2>
                </div>
                <div className="report-list">
                  {stats.sources.map((item) => (
                    <div key={item.source}>
                      <span>{sourceLabel[item.source]}</span>
                      <b>{item.count}</b>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
          {view === "clients" && (
            <div className="report-grid">
              {reportList("Заявки по организациям", stats.clients)}
              {reportList("Заявки по торговым точкам", stats.stores)}
            </div>
          )}
          {view === "team" && (
            <div className="report-grid">
              {reportList("Нагрузка по сотрудникам", stats.employees)}
              {reportList("Заявки по отделам", stats.departments)}
            </div>
          )}
          {view === "requests" && (
            <RequestsReport
              rows={stats.requests}
              statuses={statuses}
              formatDate={formatDate}
            />
          )}
          {view === "procurement" && (
            <ProcurementReport rows={procurement} formatDate={formatDate} />
          )}
        </>
      )}
    </>
  );
}
