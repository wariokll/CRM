import { api } from "../../api";

export function registerUser(body: Record<string, unknown>) {
  return api(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    false,
  );
}
