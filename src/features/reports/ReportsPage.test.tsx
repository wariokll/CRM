import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ReportsPage } from "./ReportsPage";

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="report location">{location.search}</output>;
}

describe("ReportsPage URL state", () => {
  it("restores the selected view and date filter from the URL", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/reports?view=team&from=2026-01-01"]}>
          <LocationProbe />
          <ReportsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      container.querySelector(".report-tabs button.active"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("report location")).toHaveTextContent(
      "view=team&from=2026-01-01",
    );
    fireEvent.click(container.querySelectorAll(".report-tabs button")[0]);
    expect(screen.getByLabelText("report location")).toHaveTextContent(
      "from=2026-01-01",
    );
  });
});
