import "highlight.js/styles/atom-one-light.css";
import "katex/dist/katex.min.css";

import { useDeferredValue, useMemo } from "react";

import { renderMarkdown } from "@web-speed-hackathon-2026/client/src/lib/markdown";
import { TypingIndicator } from "@web-speed-hackathon-2026/client/src/components/crok/TypingIndicator";
import { CrokLogo } from "@web-speed-hackathon-2026/client/src/components/foundation/CrokLogo";

interface Props {
  message: Models.ChatMessage;
  streaming?: boolean;
}

const UserMessage = ({ content }: { content: string }) => {
  return (
    <div className="mb-6 flex justify-end">
      <div className="bg-cax-surface-subtle text-cax-text max-w-[80%] rounded-3xl px-4 py-2">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
};

const AssistantMessage = ({ content, streaming = false }: { content: string; streaming?: boolean }) => {
  const deferredContent = useDeferredValue(content);
  // Skip expensive markdown rendering while streaming to reduce TBT
  const html = useMemo(() => {
    if (streaming) return "";
    return renderMarkdown(deferredContent);
  }, [deferredContent, streaming]);

  return (
    <div className="mb-6 flex gap-4">
      <div className="h-8 w-8 shrink-0">
        <CrokLogo className="h-full w-full" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-cax-text mb-1 text-sm font-medium">Crok</div>
        <div className="markdown text-cax-text max-w-none">
          {!deferredContent ? (
            <TypingIndicator />
          ) : streaming ? (
            <div role="status" aria-label="応答中"><p className="whitespace-pre-wrap">{deferredContent}</p></div>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: html }} />
          )}
        </div>
      </div>
    </div>
  );
};

export const ChatMessage = ({ message, streaming = false }: Props) => {
  if (message.role === "user") {
    return <UserMessage content={message.content} />;
  }
  return <AssistantMessage content={message.content} streaming={streaming} />;
};
