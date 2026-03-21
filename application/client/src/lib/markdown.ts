import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import plaintext from "highlight.js/lib/languages/plaintext";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import katex from "katex";
import { Marked } from "marked";
import markedFootnote from "marked-footnote";
import { markedHighlight } from "marked-highlight";

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("plaintext", plaintext);
hljs.registerLanguage("text", plaintext);
hljs.registerLanguage("python", python);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);

const mathInline = {
  name: "mathInline",
  level: "inline" as const,
  start(src: string) {
    return src.indexOf("$");
  },
  tokenizer(src: string) {
    const match = src.match(/^\$([^\n$]+?)\$/);
    if (match) {
      return {
        type: "mathInline",
        raw: match[0],
        text: match[1],
      };
    }
    return undefined;
  },
  renderer(token: { text: string }) {
    try {
      return katex.renderToString(token.text, { displayMode: false, throwOnError: false });
    } catch {
      return token.text;
    }
  },
};

const mathBlock = {
  name: "mathBlock",
  level: "block" as const,
  start(src: string) {
    return src.indexOf("$$");
  },
  tokenizer(src: string) {
    const match = src.match(/^\$\$\n?([\s\S]+?)\n?\$\$/);
    if (match) {
      return {
        type: "mathBlock",
        raw: match[0],
        text: match[1],
      };
    }
    return undefined;
  },
  renderer(token: { text: string }) {
    try {
      return katex.renderToString(token.text, { displayMode: true, throwOnError: false });
    } catch {
      return token.text;
    }
  },
};

const marked = new Marked(
  markedHighlight({
    highlight(code: string, lang: string) {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    },
  }),
  markedFootnote(),
  { extensions: [mathBlock, mathInline] },
);

export function renderMarkdown(content: string): string {
  return marked.parse(content, { async: false }) as string;
}
