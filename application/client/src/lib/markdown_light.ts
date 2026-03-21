import { Marked } from "marked";

const marked = new Marked();

export function renderMarkdownLight(content: string): string {
  return marked.parse(content, { async: false }) as string;
}
