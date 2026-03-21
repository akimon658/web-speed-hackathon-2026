import { TimelineItem } from "@web-speed-hackathon-2026/client/src/components/timeline/TimelineItem";

interface Props {
  timeline: Models.Post[];
}

export const Timeline = ({ timeline }: Props) => {
  let firstImagePriorityGiven = false;
  return (
    <section>
      {timeline.map((post) => {
        const shouldPrioritize = !firstImagePriorityGiven && post.images?.length > 0;
        if (shouldPrioritize) firstImagePriorityGiven = true;
        return <TimelineItem key={post.id} post={post} priority={shouldPrioritize} />;
      })}
    </section>
  );
};
