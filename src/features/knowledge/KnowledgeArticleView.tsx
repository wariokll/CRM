import {
  ArrowLeft,
  Download,
  FileText,
  Image as ImageIcon,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { knowledgeRequest } from "./queries";
import type { KnowledgeArticle, KnowledgeAttachment } from "../../types";

export function KnowledgeArticleView({
  article,
  imageUrls,
  setArticle,
  setError,
  openArticle,
  editArticle,
  deleteArticle,
  downloadAttachment,
  deleteAttachment,
  formatSize,
  errorText,
}: {
  article: KnowledgeArticle;
  imageUrls: Record<number, string>;
  setArticle: (article: KnowledgeArticle | null) => void;
  setError: (error: string) => void;
  openArticle: (id: number) => Promise<void>;
  editArticle: (article: KnowledgeArticle) => void;
  deleteArticle: (article: KnowledgeArticle) => Promise<void>;
  downloadAttachment: (attachment: KnowledgeAttachment) => Promise<void>;
  deleteAttachment: (attachment: KnowledgeAttachment) => Promise<void>;
  formatSize: (size: number) => string;
  errorText: (reason: unknown) => string;
}) {
  return (
    <article className="panel table-panel">
      <div className="knowledge-article-head">
        <div>
          <button className="link-button" onClick={() => setArticle(null)}>
            <ArrowLeft size={15} /> К списку
          </button>
          <h2>{article.title}</h2>
          <small>
            {article.section.name} · обновлено{" "}
            {new Date(article.updatedAt).toLocaleDateString("ru-RU")}
          </small>
        </div>
        <div className="knowledge-article-actions">
          <button
            className="button secondary"
            onClick={() => editArticle(article)}
          >
            <Pencil size={15} /> Изменить
          </button>
          <button
            className="button danger"
            onClick={() => void deleteArticle(article)}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      <div className="knowledge-article-body">
        {article.body
          ? article.body.split(/(\[\[image:\d+\]\])/g).map((part, index) => {
              const match = /^\[\[image:(\d+)\]\]$/.exec(part);
              if (!match) return <span key={index}>{part}</span>;
              const imageId = Number(match[1]);
              const attachment = article.attachments.find(
                (item) => item.id === imageId,
              );
              return imageUrls[imageId] ? (
                <img
                  key={index}
                  src={imageUrls[imageId]}
                  alt={attachment?.fileName ?? "Иллюстрация"}
                />
              ) : (
                <span key={index} className="knowledge-image-pending">
                  Загрузка изображения…
                </span>
              );
            })
          : "В статье пока нет текста."}
      </div>
      <div className="knowledge-files">
        <div className="knowledge-sidebar-head">
          <h3>Вложения</h3>
          <label className="button secondary">
            <Upload size={15} /> Добавить файлы
            <input
              type="file"
              hidden
              multiple
              accept=".txt,.doc,.docx,.rtf,.pdf,.png,.jpg,.jpeg,.webp,.gif"
              onChange={async (event) => {
                const selected = Array.from(event.currentTarget.files ?? []);
                if (!selected.length) return;
                setError("");
                const data = new FormData();
                selected.forEach((file) => data.append("files", file));
                try {
                  await knowledgeRequest(
                    `/knowledge/articles/${article.id}/attachments`,
                    {
                      method: "POST",
                      body: data,
                    },
                  );
                  await openArticle(article.id);
                } catch (reason) {
                  setError(errorText(reason));
                } finally {
                  event.currentTarget.value = "";
                }
              }}
            />
          </label>
        </div>
        {article.attachments
          .filter(
            (attachment) =>
              !article.body.includes(`[[image:${attachment.id}]]`),
          )
          .map((attachment) => (
            <div className="knowledge-file" key={attachment.id}>
              {imageUrls[attachment.id] ? (
                <img src={imageUrls[attachment.id]} alt={attachment.fileName} />
              ) : attachment.mimeType.startsWith("image/") ? (
                <ImageIcon size={18} />
              ) : (
                <FileText size={18} />
              )}
              <span>
                {attachment.fileName} · {formatSize(attachment.size)}
              </span>
              <button
                title="Скачать файл"
                aria-label={`Скачать ${attachment.fileName}`}
                onClick={() => void downloadAttachment(attachment)}
              >
                <Download />
              </button>
              <button
                title="Удалить файл"
                aria-label={`Удалить ${attachment.fileName}`}
                onClick={() => void deleteAttachment(attachment)}
              >
                <X />
              </button>
            </div>
          ))}
        {!article.attachments.length && (
          <small>В статье пока нет вложений.</small>
        )}
      </div>
    </article>
  );
}
