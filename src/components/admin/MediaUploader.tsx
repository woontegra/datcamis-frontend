"use client";

import { useRef, useState } from "react";
import type { MediaItem } from "@/lib/editor-images";
import { checkUploadFile, UPLOAD_ACCEPT, uploadMedia, UploadError, type UploadInfo } from "@/lib/media-upload";

type Progress = { name: string; index: number; total: number; percent: number };

/** Computer upload for the shared media library, used by the page builder picker and /admin/medya. */
export function MediaUploader({
  info,
  onUploaded,
  compact = false,
}: {
  info?: UploadInfo;
  onUploaded: (item: MediaItem) => void;
  compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const disabled = info?.enabled === false;
  const busy = progress !== null;

  async function send(list: FileList | File[]) {
    const files = Array.from(list);
    if (busy || disabled || files.length === 0) return;
    setError(null);
    setDone(null);
    const problems: string[] = [];
    let uploaded = 0;
    for (const [index, file] of files.entries()) {
      const problem = checkUploadFile(file);
      if (problem) {
        problems.push(problem);
        continue;
      }
      setProgress({ name: file.name, index: index + 1, total: files.length, percent: 0 });
      try {
        const item = await uploadMedia(file, (percent) => setProgress((current) => (current ? { ...current, percent } : current)));
        uploaded += 1;
        onUploaded(item);
      } catch (failure) {
        problems.push(failure instanceof UploadError ? `"${file.name}": ${failure.message}` : `"${file.name}" yüklenemedi.`);
      }
    }
    setProgress(null);
    if (input.current) input.current.value = "";
    if (problems.length) setError(problems.join(" "));
    if (uploaded) {
      setDone(
        compact
          ? `${uploaded === 1 ? "Görsel" : `${uploaded} görsel`} yüklendi. Uygulamak için aşağıdan seçin.`
          : `${uploaded === 1 ? "Görsel" : `${uploaded} görsel`} Medya Kütüphanesine eklendi.`,
      );
    }
  }

  return (
    <div
      className={`media-upload${compact ? " media-upload-compact" : ""}${dragging ? " is-dragging" : ""}${disabled ? " is-disabled" : ""}`}
      onDragOver={(event) => {
        if (disabled || busy || !event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(event) => {
        if (disabled || busy) return;
        event.preventDefault();
        setDragging(false);
        void send(event.dataTransfer.files);
      }}
    >
      <input
        ref={input}
        type="file"
        accept={UPLOAD_ACCEPT}
        multiple
        hidden
        aria-label="Bilgisayardan görsel seç"
        onChange={(event) => event.target.files && void send(event.target.files)}
      />
      <button type="button" className="media-upload-button" disabled={disabled || busy} onClick={() => input.current?.click()}>
        {busy ? "Yükleniyor…" : "Bilgisayardan Yükle"}
      </button>
      <p className="media-upload-hint">
        {disabled ? info?.message ?? "Görsel yükleme şu anda kapalı." : "Gözat ya da dosyayı buraya sürükleyin · JPG, PNG, WebP · en fazla 8 MB"}
      </p>
      {progress ? (
        <div className="media-upload-progress" role="status" aria-live="polite">
          <span>
            {progress.total > 1 ? `${progress.index}/${progress.total} · ` : ""}
            {progress.name} yükleniyor… %{progress.percent}
          </span>
          <progress max={100} value={progress.percent} />
        </div>
      ) : null}
      {error ? (
        <p className="media-upload-error" role="alert">
          {error}
        </p>
      ) : null}
      {done && !busy ? (
        <p className="media-upload-done" role="status">
          {done}
        </p>
      ) : null}
    </div>
  );
}
