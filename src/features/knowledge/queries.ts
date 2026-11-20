import { api, apiFile } from "../../api";

export function knowledgeRequest<T = void>(path: string, init?: RequestInit) {
  return api<T>(path, init);
}

export function downloadKnowledgeFile(path: string) {
  return apiFile(path);
}

export function uploadKnowledgeAttachments(articleId: number, files: File[]) {
  const data = new FormData();
  files.forEach((file) => data.append("files", file));
  return knowledgeRequest(`/knowledge/articles/${articleId}/attachments`, {
    method: "POST",
    body: data,
  });
}
