import { MouseEvent, useCallback, useId, useRef, useState } from "react";

import { Button } from "@web-speed-hackathon-2026/client/src/components/foundation/Button";
import { Modal } from "@web-speed-hackathon-2026/client/src/components/modal/Modal";
import { useInViewport } from "@web-speed-hackathon-2026/client/src/hooks/use_in_viewport";

interface Props {
  imageId: string;
  alt?: string;
  src: string;
  priority?: boolean;
}

/**
 * アスペクト比を維持したまま、要素のコンテンツボックス全体を埋めるように画像を拡大縮小します
 */
export const CoveredImage = ({ imageId, alt: altProp = "", src, priority = false }: Props) => {
  const dialogId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [alt, setAlt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ダイアログの背景をクリックしたときに投稿詳細ページに遷移しないようにする
  const handleDialogClick = useCallback((ev: MouseEvent<HTMLDialogElement>) => {
    ev.stopPropagation();
  }, []);

  const handleShowAlt = useCallback(async () => {
    dialogRef.current?.showModal();
    if (alt !== null) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/images/${imageId}/alt`);
      const data = await res.json() as { alt: string };
      setAlt(data.alt);
    } catch {
      setAlt("");
    } finally {
      setLoading(false);
    }
  }, [alt, imageId]);

  const { ref: inViewRef, isInViewport } = useInViewport();

  if (!priority && !isInViewport) {
    return <div ref={inViewRef} className="h-full w-full" />;
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <img
        alt={altProp}
        className="h-full w-full object-cover"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        src={src}
        width={800}
        height={450}
      />

      <button
        className="border-cax-border bg-cax-surface-raised/90 text-cax-text-muted hover:bg-cax-surface absolute right-1 bottom-1 rounded-full border px-2 py-1 text-center text-xs"
        type="button"
        onClick={handleShowAlt}
      >
        ALT を表示する
      </button>

      <Modal ref={dialogRef} id={dialogId} closedby="any" onClick={handleDialogClick}>
        <div className="grid gap-y-6">
          <h1 className="text-center text-2xl font-bold">画像の説明</h1>

          <p className="text-sm">{loading ? "読み込み中..." : (alt ?? "")}</p>

          <Button variant="secondary" command="close" commandfor={dialogId}>
            閉じる
          </Button>
        </div>
      </Modal>
    </div>
  );
};
