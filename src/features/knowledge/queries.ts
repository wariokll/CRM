import { api, apiFile } from "../../api";

export function knowledgeRequest<T = void>(path: string, init?: RequestInit) {
  return api<T>(path, init);
}

export function downloadKnowledgeFile(path: string) {
  return apiFile(path);
}
