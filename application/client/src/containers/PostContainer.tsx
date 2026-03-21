import { useRef } from "react";
import { Helmet } from "react-helmet";
import { useParams } from "react-router";

import { InfiniteScroll } from "@web-speed-hackathon-2026/client/src/components/foundation/InfiniteScroll";
import { PostPage } from "@web-speed-hackathon-2026/client/src/components/post/PostPage";
import { NotFoundContainer } from "@web-speed-hackathon-2026/client/src/containers/NotFoundContainer";
import { useFetch } from "@web-speed-hackathon-2026/client/src/hooks/use_fetch";
import { useInfiniteFetch } from "@web-speed-hackathon-2026/client/src/hooks/use_infinite_fetch";
import { fetchJSON } from "@web-speed-hackathon-2026/client/src/utils/fetchers";

function consumeInitialPost(): Models.Post | null {
  if ((window as any).__INITIAL_POST__) {
    const data = (window as any).__INITIAL_POST__ as Models.Post;
    delete (window as any).__INITIAL_POST__;
    return data;
  }
  return null;
}

const PostContainerContent = ({ postId }: { postId: string | undefined }) => {
  const initialPostRef = useRef(consumeInitialPost());
  const { data: fetchedPost, isLoading: isLoadingPost } = useFetch<Models.Post>(
    `/api/v1/posts/${postId}`,
    fetchJSON,
    initialPostRef.current == null,
  );
  const post = initialPostRef.current ?? fetchedPost;

  const { data: comments, fetchMore, hasMore } = useInfiniteFetch<Models.Comment>(
    `/api/v1/posts/${postId}/comments`,
    fetchJSON,
  );

  if (isLoadingPost && initialPostRef.current == null) {
    return (
      <Helmet>
        <title>読込中 - CaX</title>
      </Helmet>
    );
  }

  if (post === null) {
    return <NotFoundContainer />;
  }

  return (
    <InfiniteScroll fetchMore={fetchMore} hasMore={hasMore} items={comments}>
      <Helmet>
        <title>{post.user.name} さんのつぶやき - CaX</title>
      </Helmet>
      <PostPage comments={comments} post={post} />
    </InfiniteScroll>
  );
};

export const PostContainer = () => {
  const { postId } = useParams();
  return <PostContainerContent key={postId} postId={postId} />;
};
