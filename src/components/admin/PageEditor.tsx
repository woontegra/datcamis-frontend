"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserApi } from "@/lib/api";
import type { PageBlock, PageDocument } from "@/lib/types";

type Revision = { version: number; document: PageDocument };
type EditorPage = { id: string; title: string; slug: string; status: string; revisions: Revision[] };

export function PageEditor({ page }: { page: EditorPage }) {
  const router = useRouter();
  const latest = page.revisions[0];
  const [document, setDocument] = useState<PageDocument>(latest?.document || { version: 1, sections: [] });
  const [selected, setSelected] = useState(document.sections[0]?.blocks[0]?.id || "");
  const [message, setMessage] = useState("");

  function updateBlock(id: string, patch: Partial<PageBlock>) {
    setDocument({
      ...document,
      sections: document.sections.map((section) => ({
        ...section,
        blocks: section.blocks.map((block) => (block.id === id ? { ...block, ...patch, props: patch.props || block.props } : block)),
      })),
    });
  }

  const block = document.sections.flatMap((section) => section.blocks).find((item) => item.id === selected);

  async function save(publish: boolean) {
    setMessage("");
    try {
      await browserApi(`/admin/pages/${page.id}/revisions`, { method: "POST", body: JSON.stringify({ document }) });
      if (publish) await browserApi(`/admin/pages/${page.id}/publish`, { method: "POST" });
      setMessage(publish ? "Yayınlandı." : "Taslak kaydedildi.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kaydedilemedi.");
    }
  }

  return (
    <div className="split">
      <section className="panel-admin">
        <p style={{ marginTop: 0 }}>{page.title} · {page.status} · v{latest?.version || 0}</p>
        {document.sections.map((section) => (
          <div key={section.id}>
            {section.blocks.map((item) => (
              <button key={item.id} className="text-btn" type="button" aria-pressed={item.id === selected} onClick={() => setSelected(item.id)} style={{ margin: "0.2rem" }}>
                {item.type}
              </button>
            ))}
          </div>
        ))}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.8rem" }}>
          <button className="text-btn" type="button" onClick={() => save(false)}>Taslak kaydet</button>
          <button className="green-btn" type="button" onClick={() => save(true)}>Yayınla</button>
        </div>
        {message ? <p>{message}</p> : null}
      </section>
      {block ? (
        <section className="panel-admin">
          <p>Görünürlük</p>
          {(["desktop", "tablet", "mobile"] as const).map((key) => (
            <label key={key} style={{ display: "flex", gap: "0.4rem", marginBottom: "0.3rem" }}>
              <input
                type="checkbox"
                checked={block.visibility[key]}
                onChange={(event) => updateBlock(block.id, { visibility: { ...block.visibility, [key]: event.target.checked } })}
              />
              {key}
            </label>
          ))}
          <div className="form-grid two">
            {(["top", "right", "bottom", "left"] as const).map((key) => (
              <label className="field" key={key}>{key}
                <input
                  type="number"
                  min={0}
                  max={240}
                  value={block.spacing[key]}
                  onChange={(event) => updateBlock(block.id, { spacing: { ...block.spacing, [key]: Number(event.target.value) } })}
                />
              </label>
            ))}
          </div>
          {Object.entries(block.props).map(([key, value]) => (
            typeof value === "string" || typeof value === "number" ? (
              <label className="field" key={key} style={{ marginTop: "0.45rem" }}>{key}
                <input
                  value={String(value)}
                  onChange={(event) => updateBlock(block.id, { props: { ...block.props, [key]: typeof value === "number" ? Number(event.target.value) : event.target.value } })}
                />
              </label>
            ) : null
          ))}
        </section>
      ) : null}
    </div>
  );
}
