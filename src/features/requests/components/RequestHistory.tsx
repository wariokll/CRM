import { formatDate } from "../../../shared/formatDate";
import type { ServiceRequest } from "../../../types";

export function RequestHistory({ item }: { item: ServiceRequest }) {
  return (
    <>
      {item.activities?.length > 0 && (
        <section className="activity-list">
          <h3>История изменений</h3>
          {item.activities.map((activity) => (
            <div className="activity-row" key={activity.id}>
              <span>{formatDate(activity.createdAt)}</span>
              <div>
                <b>{activity.message}</b>
                <small>{activity.author?.ipName ?? "Система"}</small>
              </div>
            </div>
          ))}
        </section>
      )}
      {item.comments.length > 0 && (
        <section className="comment-list">
          {item.comments.map((c) => (
            <div
              className={
                c.visibility === "INTERNAL"
                  ? "internal-comment"
                  : "admin-comment"
              }
              key={c.id}
            >
              <b>
                {c.author.ipName} ·{" "}
                {c.visibility === "INTERNAL" ? "внутренний" : "клиентский"}
              </b>
              <p>{c.body}</p>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
