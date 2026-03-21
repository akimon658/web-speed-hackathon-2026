import classNames from "classnames";
import { useCallback, useEffect, useRef, useState } from "react";

import { AspectRatioBox } from "@web-speed-hackathon-2026/client/src/components/foundation/AspectRatioBox";
import { FontAwesomeIcon } from "@web-speed-hackathon-2026/client/src/components/foundation/FontAwesomeIcon";
import { useInViewport } from "@web-speed-hackathon-2026/client/src/hooks/use_in_viewport";

interface Props {
  src: string;
}

/**
 * クリックすると再生・一時停止を切り替えます。
 */
export const PausableMovie = ({ src }: Props) => {
  const { ref: inViewRef, isInViewport } = useInViewport();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  // 視覚効果 off のとき動画を自動再生しない
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (prefersReducedMotion && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [prefersReducedMotion]);

  const handleClick = useCallback(() => {
    setIsPlaying((prev) => {
      if (prev) {
        videoRef.current?.pause();
      } else {
        videoRef.current?.play();
      }
      return !prev;
    });
  }, []);

  if (!isInViewport) {
    return (
      <AspectRatioBox aspectHeight={1} aspectWidth={1}>
        <div ref={inViewRef} className="h-full w-full" />
      </AspectRatioBox>
    );
  }

  return (
    <AspectRatioBox aspectHeight={1} aspectWidth={1}>
      <button
        aria-label="動画プレイヤー"
        className="group relative block h-full w-full"
        onClick={handleClick}
        type="button"
      >
        <video
          ref={videoRef}
          autoPlay={!prefersReducedMotion}
          className="h-full w-full object-cover"
          loop
          muted
          playsInline
          preload="metadata"
          src={src}
        />
        <div ref={inViewRef} className="absolute inset-0" />
        <div
          className={classNames(
            "absolute left-1/2 top-1/2 flex items-center justify-center w-16 h-16 text-cax-surface-raised text-3xl bg-cax-overlay/50 rounded-full -translate-x-1/2 -translate-y-1/2",
            {
              "opacity-0 group-hover:opacity-100": isPlaying,
            },
          )}
        >
          <FontAwesomeIcon iconType={isPlaying ? "pause" : "play"} styleType="solid" />
        </div>
      </button>
    </AspectRatioBox>
  );
};
