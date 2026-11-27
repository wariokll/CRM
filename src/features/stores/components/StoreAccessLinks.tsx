import type { Store, StoreAccess } from "../../../types";

export function StoreAccessLinks({
  access,
  compact = false,
}: {
  access?: Store["access"] | StoreAccess | null;
  compact?: boolean;
}) {
  const anydeskRaw = access?.anydeskId?.trim(),
    anydeskAddress =
      anydeskRaw &&
      (/^[\d\s-]+$/.test(anydeskRaw)
        ? anydeskRaw.replace(/\D/g, "")
        : anydeskRaw.replace(/\s+/g, ""));
  if (!anydeskAddress && !access?.ofdUrl && !access?.nalogUrl) return null;
  return (
    <div
      className={"store-actions" + (compact ? " compact-store-actions" : "")}
    >
      {anydeskAddress && (
        <a
          className="button secondary anydesk-button"
          href={"anydesk:" + anydeskAddress}
          onClick={(event) => {
            event.stopPropagation();
            void navigator.clipboard
              ?.writeText(anydeskAddress)
              .catch(() => undefined);
          }}
        >
          Подключиться через AnyDesk
        </a>
      )}
      {access?.ofdUrl && (
        <a
          className="button secondary"
          href={access?.ofdUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          Открыть ОФД
        </a>
      )}
      {access?.nalogUrl && (
        <a
          className="button secondary"
          href={access?.nalogUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          Открыть налоговую
        </a>
      )}
    </div>
  );
}
