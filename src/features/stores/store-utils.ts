export function storeErrorText(reason: unknown) {
  return reason instanceof Error ? reason.message : "Request failed";
}
