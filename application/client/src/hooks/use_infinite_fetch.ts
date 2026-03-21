import { useCallback, useEffect, useRef, useState } from "react";

const LIMIT = 30;

interface ReturnValues<T> {
  data: Array<T>;
  error: Error | null;
  hasMore: boolean;
  isLoading: boolean;
  fetchMore: () => void;
}

function consumeInitialData<T>(apiPath: string): T[] | null {
  if (apiPath === "/api/v1/posts" && (window as any).__INITIAL_POSTS__) {
    const data = (window as any).__INITIAL_POSTS__ as T[];
    delete (window as any).__INITIAL_POSTS__;
    return data;
  }
  return null;
}

export function useInfiniteFetch<T>(
  apiPath: string,
  fetcher: (apiPath: string) => Promise<T[]>,
): ReturnValues<T> {
  const internalRef = useRef({ isLoading: false, offset: 0, hasMore: true });

  const [result, setResult] = useState<Omit<ReturnValues<T>, "fetchMore">>(() => {
    const initialData = consumeInitialData<T>(apiPath);
    if (initialData) {
      const newHasMore = initialData.length > 0;
      internalRef.current = {
        isLoading: false,
        offset: initialData.length,
        hasMore: newHasMore,
      };
      return {
        data: initialData,
        error: null,
        hasMore: newHasMore,
        isLoading: false,
      };
    }
    return {
      data: [],
      error: null,
      hasMore: true,
      isLoading: true,
    };
  });

  const fetchMore = useCallback(() => {
    const { isLoading, offset, hasMore } = internalRef.current;
    if (isLoading || !hasMore) {
      return;
    }

    setResult((cur) => ({
      ...cur,
      isLoading: true,
    }));
    internalRef.current = {
      ...internalRef.current,
      isLoading: true,
    };

    const separator = apiPath.includes("?") ? "&" : "?";
    const paginatedPath = `${apiPath}${separator}limit=${LIMIT}&offset=${offset}`;

    void fetcher(paginatedPath).then(
      (pageData) => {
        const newHasMore = pageData.length >= LIMIT;
        setResult((cur) => ({
          ...cur,
          data: [...cur.data, ...pageData],
          hasMore: newHasMore,
          isLoading: false,
        }));
        internalRef.current = {
          isLoading: false,
          offset: offset + pageData.length,
          hasMore: newHasMore,
        };
      },
      (error) => {
        setResult((cur) => ({
          ...cur,
          error,
          isLoading: false,
        }));
        internalRef.current = {
          ...internalRef.current,
          isLoading: false,
        };
      },
    );
  }, [apiPath, fetcher]);

  useEffect(() => {
    // 初期データが既にある場合はfetchをスキップ
    if (result.data.length > 0 && !result.isLoading) {
      return;
    }

    setResult(() => ({
      data: [],
      error: null,
      hasMore: true,
      isLoading: true,
    }));
    internalRef.current = {
      isLoading: false,
      offset: 0,
      hasMore: true,
    };

    fetchMore();
  }, [fetchMore]);

  return {
    ...result,
    fetchMore,
  };
}
