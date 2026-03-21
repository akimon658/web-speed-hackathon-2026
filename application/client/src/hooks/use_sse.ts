import { useCallback, useRef, useState } from "react";

interface SSEOptions<T> {
  onMessage: (data: T, prevContent: string) => string;
  onDone?: (data: T) => boolean;
  onComplete?: (finalContent: string) => void;
}

interface ReturnValues {
  content: string;
  isStreaming: boolean;
  start: (url: string) => void;
  stop: () => void;
  reset: () => void;
}

export function useSSE<T>(options: SSEOptions<T>): ReturnValues {
  const [content, setContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const contentRef = useRef("");

  const stop = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setContent("");
    contentRef.current = "";
  }, [stop]);

  const start = useCallback(
    (url: string) => {
      stop();
      contentRef.current = "";
      setContent("");
      setIsStreaming(true);

      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      let throttleTimer: ReturnType<typeof setTimeout> | null = null;

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data) as T;

        const isDone = options.onDone?.(data) ?? false;
        if (isDone) {
          if (throttleTimer) {
            clearTimeout(throttleTimer);
            throttleTimer = null;
          }
          setContent(contentRef.current);
          options.onComplete?.(contentRef.current);
          stop();
          return;
        }

        const newContent = options.onMessage(data, contentRef.current);
        contentRef.current = newContent;

        // Throttle UI updates to reduce main thread blocking from markdown rendering
        if (!throttleTimer) {
          throttleTimer = setTimeout(() => {
            throttleTimer = null;
            setContent(contentRef.current);
          }, 150);
        }
      };

      eventSource.onerror = (error) => {
        console.error("SSE Error:", error);
        stop();
      };
    },
    [options, stop],
  );

  return { content, isStreaming, start, stop, reset };
}
