import { createBrowserRouter } from "react-router-dom";
import { AppContent } from "../features/layout/components/AppContent";
import { NotFoundPage } from "../features/layout/pages/NotFoundPage";

const sections = [
  "requests",
  "calendar",
  "organizations",
  "stores",
  "my-boards",
  "team-boards",
  "reports",
  "templates",
  "staff",
  "telegram",
  "knowledge",
];

export const router = createBrowserRouter([
  { path: "/", element: <AppContent /> },
  { path: "/requests/:requestId", element: <AppContent /> },
  ...sections.map((path) => ({ path: `/${path}`, element: <AppContent /> })),
  { path: "*", element: <NotFoundPage /> },
]);
