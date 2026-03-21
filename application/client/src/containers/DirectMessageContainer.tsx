import { useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { useParams } from "react-router";

import { DirectMessageGate } from "@web-speed-hackathon-2026/client/src/components/direct_message/DirectMessageGate";
import { DirectMessagePage } from "@web-speed-hackathon-2026/client/src/components/direct_message/DirectMessagePage";
import { NotFoundContainer } from "@web-speed-hackathon-2026/client/src/containers/NotFoundContainer";
import { DirectMessageFormData } from "@web-speed-hackathon-2026/client/src/direct_message/types";
import { useWs } from "@web-speed-hackathon-2026/client/src/hooks/use_ws";
import { fetchJSON, sendJSON } from "@web-speed-hackathon-2026/client/src/utils/fetchers";

interface DmUpdateEvent {
  type: "dm:conversation:message";
  payload: Models.DirectMessage;
}
interface DmTypingEvent {
  type: "dm:conversation:typing";
  payload: {};
}

const TYPING_INDICATOR_DURATION_MS = 10 * 1000;
const TYPING_THROTTLE_MS = 3000;
const MESSAGES_LIMIT = 30;

interface Props {
  activeUser: Models.User | null;
  authModalId: string;
}

export const DirectMessageContainer = ({ activeUser, authModalId }: Props) => {
  const { conversationId = "" } = useParams<{ conversationId: string }>();

  const [conversation, setConversation] = useState<Models.DirectMessageConversation | null>(null);
  const [conversationError, setConversationError] = useState<Error | null>(null);
  const [messages, setMessages] = useState<Models.DirectMessage[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const peerTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const offsetRef = useRef(0);

  const loadConversation = useCallback(async () => {
    if (activeUser == null) {
      return;
    }

    try {
      const data = await fetchJSON<Models.DirectMessageConversation>(
        `/api/v1/dm/${conversationId}`,
      );
      setConversation(data);
      setConversationError(null);
    } catch (error) {
      setConversation(null);
      setConversationError(error as Error);
    }
  }, [activeUser, conversationId]);

  const loadMessages = useCallback(async () => {
    if (activeUser == null) {
      return;
    }

    try {
      const data = await fetchJSON<Models.DirectMessage[]>(
        `/api/v1/dm/${conversationId}/messages?limit=${MESSAGES_LIMIT}&offset=0`,
      );
      setMessages(data);
      offsetRef.current = data.length;
      setHasMore(data.length >= MESSAGES_LIMIT);
    } catch {
      // conversation error will handle display
    }
  }, [activeUser, conversationId]);

  const fetchMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const data = await fetchJSON<Models.DirectMessage[]>(
        `/api/v1/dm/${conversationId}/messages?limit=${MESSAGES_LIMIT}&offset=${offsetRef.current}`,
      );
      setMessages((prev) => [...data, ...prev]);
      offsetRef.current += data.length;
      setHasMore(data.length >= MESSAGES_LIMIT);
    } finally {
      setIsLoadingMore(false);
    }
  }, [conversationId, isLoadingMore, hasMore]);

  const sendRead = useCallback(async () => {
    await sendJSON(`/api/v1/dm/${conversationId}/read`, {});
  }, [conversationId]);

  useEffect(() => {
    void loadConversation();
    void loadMessages();
    void sendRead();
  }, [loadConversation, loadMessages, sendRead]);

  const handleSubmit = useCallback(
    async (params: DirectMessageFormData) => {
      setIsSubmitting(true);
      try {
        const message = await sendJSON<Models.DirectMessage>(`/api/v1/dm/${conversationId}/messages`, {
          body: params.body,
        });
        setMessages((prev) => [...prev, message]);
        offsetRef.current += 1;
      } finally {
        setIsSubmitting(false);
      }
    },
    [conversationId],
  );

  const handleTyping = useCallback(async () => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < TYPING_THROTTLE_MS) {
      return;
    }
    lastTypingSentRef.current = now;
    void sendJSON(`/api/v1/dm/${conversationId}/typing`, {});
  }, [conversationId]);

  useWs(`/api/v1/dm/${conversationId}`, (event: DmUpdateEvent | DmTypingEvent) => {
    if (event.type === "dm:conversation:message") {
      const newMessage = event.payload;
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) {
          return prev.map((m) => (m.id === newMessage.id ? newMessage : m));
        }
        offsetRef.current += 1;
        return [...prev, newMessage];
      });
      if (newMessage.sender.id !== activeUser?.id) {
        setIsPeerTyping(false);
        if (peerTypingTimeoutRef.current !== null) {
          clearTimeout(peerTypingTimeoutRef.current);
        }
        peerTypingTimeoutRef.current = null;
      }
      void sendRead();
    } else if (event.type === "dm:conversation:typing") {
      setIsPeerTyping(true);
      if (peerTypingTimeoutRef.current !== null) {
        clearTimeout(peerTypingTimeoutRef.current);
      }
      peerTypingTimeoutRef.current = setTimeout(() => {
        setIsPeerTyping(false);
      }, TYPING_INDICATOR_DURATION_MS);
    }
  });

  if (activeUser === null) {
    return (
      <DirectMessageGate
        headline="DMを利用するにはサインインしてください"
        authModalId={authModalId}
      />
    );
  }

  if (conversation == null) {
    if (conversationError != null) {
      return <NotFoundContainer />;
    }
    return null;
  }

  const peer =
    conversation.initiator.id !== activeUser?.id ? conversation.initiator : conversation.member;

  return (
    <>
      <Helmet>
        <title>{peer.name} さんとのダイレクトメッセージ - CaX</title>
      </Helmet>
      <DirectMessagePage
        conversationError={conversationError}
        conversation={conversation}
        messages={messages}
        activeUser={activeUser}
        onTyping={handleTyping}
        isPeerTyping={isPeerTyping}
        isSubmitting={isSubmitting}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        fetchMore={fetchMore}
        onSubmit={handleSubmit}
      />
    </>
  );
};
