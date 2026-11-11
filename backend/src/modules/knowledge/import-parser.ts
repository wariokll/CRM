import mammoth from "mammoth";
import { extname } from "node:path";

export type ImportedImage = { buffer: Buffer; mimeType: string };

function decodeTextFile(buffer: Buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xfe)
    return new TextDecoder("utf-16le").decode(buffer.subarray(2));
  if (buffer[0] === 0xfe && buffer[1] === 0xff)
    return new TextDecoder("utf-16be").decode(buffer.subarray(2));
  try {
    return new TextDecoder("utf-8", { fatal: true })
      .decode(buffer)
      .replace(/^\uFEFF/, "");
  } catch {
    return new TextDecoder("windows-1251")
      .decode(buffer)
      .replace(/^\uFEFF/, "");
  }
}

function decodeHtmlEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(
    /&(#x[\da-f]+|#\d+|[a-z]+);/gi,
    (entity, code: string) => {
      if (code.startsWith("#x") || code.startsWith("#")) {
        const point = code.startsWith("#x")
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10);
        return point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff)
          ? String.fromCodePoint(point)
          : "\uFFFD";
      }
      return named[code.toLowerCase()] ?? entity;
    },
  );
}

export async function parseImportFile(file: Express.Multer.File) {
  if (extname(file.originalname).toLowerCase() === ".txt")
    return { body: decodeTextFile(file.buffer), images: [] as ImportedImage[] };

  const images: ImportedImage[] = [];
  const result = await mammoth.convertToHtml(
    { buffer: file.buffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const index = images.length;
        images.push({
          buffer: await image.read(),
          mimeType: image.contentType,
        });
        return { src: `knowledge-image:${index}` };
      }),
    },
  );
  const body = result.value
    .replace(
      /<img\b[^>]*src=["']knowledge-image:(\d+)["'][^>]*>/gi,
      "\n[[import-image:$1]]\n",
    )
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|h[1-6]|li|tr|blockquote)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity) =>
      decodeHtmlEntities(entity),
    )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { body, images };
}

export function imageExtension(mimeType: string) {
  const extensions: Record<string, string> = {
    "image/gif": "gif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/svg+xml": "svg",
    "image/webp": "webp",
  };
  return extensions[mimeType] ?? "bin";
}
