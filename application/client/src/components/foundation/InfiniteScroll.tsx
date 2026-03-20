import { ReactNode, useCallback, useEffect, useRef } from "react";

interface Props {
  children: ReactNode;
  hasMore: boolean;
  items: any[];
  fetchMore: () => void;
}

export const InfiniteScroll = ({ children, fetchMore, hasMore, items }: Props) => {
  const latestItem = items[items.length - 1];
  const sentinelRef = useRef<HTMLDivElement>(null);
  const fetchMoreRef = useRef(fetchMore);
  fetchMoreRef.current = fetchMore;

  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;

  const latestItemRef = useRef(latestItem);
  latestItemRef.current = latestItem;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && latestItemRef.current !== undefined && hasMoreRef.current) {
          fetchMoreRef.current();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {children}
      <div ref={sentinelRef} />
    </>
  );
};
