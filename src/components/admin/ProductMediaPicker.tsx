"use client";

import { useEffect, useState } from "react";
import { browserApi } from "@/lib/api";
import { MediaUploader } from "@/components/admin/MediaUploader";
import type { MediaItem } from "@/lib/editor-images";
import type { UploadUsage } from "@/lib/media-upload";

export function ProductMediaPicker({ onPick, usage = "product" }: { onPick: (item: MediaItem) => void; usage?: UploadUsage }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [open, setOpen] = useState(false);

  async function load() {
    const body = await browserApi<{ data: MediaItem[] }>("/admin/media");
    setItems(body.data);
  }

  useEffect(() => {
    if (open) void load().catch(() => setItems([]));
  }, [open]);

  return (
    <div>
      <button className="text-btn" type="button" onClick={() => setOpen((value) => !value)}>
        {open ? "Kütüphaneyi kapat" : "Medya Kütüphanesinden seç"}
      </button>
      {open ? (
        <div className="product-media-grid" style={{ marginTop: "0.5rem" }}>
          {items.map((item) => (
            <button key={item.id} type="button" className="product-thumb" onClick={() => onPick(item)}>
              <img src={item.url} alt={item.alt || item.filename} />
            </button>
          ))}
        </div>
      ) : null}
      <MediaUploader compact usage={usage} onUploaded={(item) => { onPick(item); void load().catch(() => undefined); }} />
    </div>
  );
}
