"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, browserApi } from "@/lib/api";
import { DragHandle } from "../taxonomy/shared";

type ItemType = "CATEGORY" | "COLLECTION" | "PAGE" | "CUSTOM";
type Location = "HEADER" | "FOOTER_1" | "FOOTER_2" | "FOOTER_3";

export type MenuSummary = { id: string; name: string; location: Location | null; itemCount: number };
export type MenuSources = {
  categories: Array<{ id: string; name: string; parentId: string | null; isVisible: boolean }>;
  collections: Array<{ id: string; name: string; isVisible: boolean }>;
  pages: Array<{ pageKey: string | null; pageId: string | null; title: string; live: boolean }>;
};
export type MenuMeta = { canEdit: boolean; maxDepth: number; locations: Array<{ value: Location; label: string }>; sources: MenuSources };

type ApiItem = {
  key: string;
  parentKey: string | null;
  type: ItemType;
  categoryId: string | null;
  collectionId: string | null;
  pageId: string | null;
  pageKey: string | null;
  url: string | null;
  label: string;
  defaultLabel: string;
  openInNewTab: boolean;
  isHidden: boolean;
  problem: string | null;
};
export type MenuDetail = { id: string; name: string; location: Location | null; items: ApiItem[] };

type TreeNode = Omit<ApiItem, "parentKey"> & { children: TreeNode[] };
type Draft = { name: string; location: Location | null; tree: TreeNode[] };
type Drop = { key: string; zone: "before" | "after"; nest: boolean };

const NEW = "__new__";
const NEST_OFFSET = 48;
const TYPE_LABELS: Record<ItemType, string> = { CATEGORY: "Kategori", COLLECTION: "Koleksiyon", PAGE: "Sayfa", CUSTOM: "Özel bağlantı" };
const LEAVE_TEXT = "Kaydedilmemiş değişiklikler silinsin mi?";

let counter = 0;
const newKey = () => `n-${Date.now().toString(36)}-${(counter += 1)}`;

function toTree(items: ApiItem[]): TreeNode[] {
  const tops = items.filter((item) => !item.parentKey);
  return tops.map((top) => ({ ...strip(top), children: items.filter((item) => item.parentKey === top.key).map((child) => ({ ...strip(child), children: [] })) }));
}

function strip(item: ApiItem): Omit<TreeNode, "children"> {
  const { parentKey: _parentKey, ...rest } = item;
  void _parentKey;
  return rest;
}

function toDraft(menu: MenuDetail | null): Draft {
  return { name: menu?.name ?? "", location: menu?.location ?? null, tree: menu ? toTree(menu.items) : [] };
}

function flatten(tree: TreeNode[]) {
  return tree.flatMap((node) => [{ node, depth: 1, parent: null as TreeNode | null }, ...node.children.map((child) => ({ node: child, depth: 2, parent: node }))]);
}

function toPayload(node: TreeNode, parentKey: string | null) {
  return {
    key: node.key,
    parentKey,
    type: node.type,
    categoryId: node.categoryId,
    collectionId: node.collectionId,
    pageId: node.pageId,
    pageKey: node.pageKey,
    url: node.type === "CUSTOM" ? node.url : null,
    label: node.label,
    openInNewTab: node.openInNewTab,
    isHidden: node.isHidden,
  };
}

function payloadItems(tree: TreeNode[]) {
  return tree.flatMap((node) => [toPayload(node, null), ...node.children.map((child) => toPayload(child, node.key))]);
}

/** Mirrors the backend rule: relative store paths, https/http, mailto and tel only. */
function safeUrl(raw: string) {
  const value = raw.trim();
  if (!value || value.length > 500 || /[\u0000-\u001f\u007f\s\\]/.test(value)) return false;
  if (value.startsWith("/")) return !value.startsWith("//");
  if (value.startsWith("#")) return true;
  if (/^mailto:[^@\s]+@[^@\s]+$/i.test(value)) return true;
  if (/^tel:\+?[0-9()\-.]{3,30}$/.test(value)) return true;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

function removeNode(tree: TreeNode[], key: string): { tree: TreeNode[]; node: TreeNode | null } {
  const found = tree.find((node) => node.key === key) ?? tree.flatMap((node) => node.children).find((child) => child.key === key) ?? null;
  const next = tree
    .filter((node) => node.key !== key)
    .map((node) => ({ ...node, children: node.children.filter((child) => child.key !== key) }));
  return { tree: next, node: found };
}

function updateNode(tree: TreeNode[], key: string, patch: Partial<TreeNode>): TreeNode[] {
  return tree.map((node) => (node.key === key
    ? { ...node, ...patch }
    : { ...node, children: node.children.map((child) => (child.key === key ? { ...child, ...patch } : child)) }));
}

export function MenuManager({ initialMenus, initialMenu, meta }: { initialMenus: MenuSummary[]; initialMenu: MenuDetail | null; meta: MenuMeta }) {
  const { canEdit, sources, locations } = meta;
  const [menus, setMenus] = useState(initialMenus);
  const [selected, setSelected] = useState(initialMenu?.id ?? NEW);
  const [draft, setDraft] = useState<Draft>(() => toDraft(initialMenu));
  const [base, setBase] = useState<Draft>(() => toDraft(initialMenu));
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [drop, setDrop] = useState<Drop | null>(null);

  const dirty = JSON.stringify(draft) !== JSON.stringify(base);
  const rows = useMemo(() => flatten(draft.tree), [draft.tree]);
  const current = menus.find((menu) => menu.id === selected);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function setTree(tree: TreeNode[]) {
    setDraft((prev) => ({ ...prev, tree }));
    setMessage(null);
  }

  async function openMenu(id: string) {
    if (id === selected) return;
    if (dirty && !window.confirm(LEAVE_TEXT)) return;
    setMessage(null);
    setEditing(null);
    if (id === NEW) {
      const next = { name: "", location: null, tree: [] };
      setSelected(NEW);
      setDraft(next);
      setBase(next);
      return;
    }
    try {
      const body = await browserApi<{ data: MenuDetail }>(`/admin/menus/${id}`);
      const next = toDraft(body.data);
      setSelected(id);
      setDraft(next);
      setBase(next);
    } catch {
      setMessage({ tone: "error", text: "Menü yüklenemedi, lütfen tekrar deneyin." });
    }
  }

  function fail(error: unknown, fallback: string) {
    if (error instanceof ApiError) {
      if (error.status === 403) {
        setMessage({ tone: "error", text: "Menüleri yalnızca Owner, Admin ve Editor değiştirebilir." });
        return;
      }
      const index = Number(error.details?.[0]?.path.split(".")[1]);
      const payload = payloadItems(draft.tree);
      if (Number.isInteger(index) && payload[index]) setEditing(payload[index].key);
      setMessage({ tone: "error", text: error.message });
    } else {
      setMessage({ tone: "error", text: fallback });
    }
  }

  async function save() {
    if (busy || !canEdit) return;
    if (draft.name.trim().length < 2) {
      setMessage({ tone: "error", text: "Menü adı en az 2 karakter olmalı." });
      return;
    }
    const badLink = rows.find(({ node }) => node.type === "CUSTOM" && !safeUrl(node.url ?? ""));
    if (badLink) {
      setEditing(badLink.node.key);
      setMessage({ tone: "error", text: "Bağlantı güvenli değil. “/” ile başlayan site içi adres, https://, mailto: veya tel: kullanın." });
      return;
    }
    setBusy(true);
    setMessage(null);
    const payload = { name: draft.name.trim(), location: draft.location, items: payloadItems(draft.tree) };
    try {
      const saved = selected === NEW
        ? await browserApi<{ data: { id: string } }>("/admin/menus", { method: "POST", body: JSON.stringify(payload) })
        : await browserApi<{ data: { id: string } }>(`/admin/menus/${selected}`, { method: "PUT", body: JSON.stringify(payload) });
      const [list, detail] = await Promise.all([
        browserApi<{ data: MenuSummary[] }>("/admin/menus"),
        browserApi<{ data: MenuDetail }>(`/admin/menus/${saved.data.id}`),
      ]);
      const next = toDraft(detail.data);
      setMenus(list.data);
      setSelected(saved.data.id);
      setDraft(next);
      setBase(next);
      setEditing(null);
      setMessage({ tone: "ok", text: "Kaydedildi." });
    } catch (error) {
      fail(error, "Kaydedilemedi, lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  async function removeMenu() {
    if (!current || busy || !canEdit) return;
    const where = current.location ? ` Bu menü şu an “${locations.find((item) => item.value === current.location)?.label}” yerinde görünüyor; silinirse orası boş kalır.` : "";
    if (!window.confirm(`“${current.name}” menüsü silinsin mi?${where}`)) return;
    setBusy(true);
    try {
      await browserApi(`/admin/menus/${current.id}`, { method: "DELETE" });
      const list = await browserApi<{ data: MenuSummary[] }>("/admin/menus");
      setMenus(list.data);
      const first = list.data[0];
      if (first) {
        const body = await browserApi<{ data: MenuDetail }>(`/admin/menus/${first.id}`);
        const next = toDraft(body.data);
        setSelected(first.id);
        setDraft(next);
        setBase(next);
      } else {
        const next = { name: "", location: null, tree: [] };
        setSelected(NEW);
        setDraft(next);
        setBase(next);
      }
      setMessage({ tone: "ok", text: "Menü silindi." });
    } catch (error) {
      fail(error, "Silinemedi, lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  function addNodes(nodes: Array<Omit<TreeNode, "key" | "children">>) {
    if (!nodes.length) return;
    setTree([...draft.tree, ...nodes.map((node) => ({ ...node, key: newKey(), children: [] }))]);
    setMessage({ tone: "ok", text: `${nodes.length} öğe menünün sonuna eklendi. Kaydetmeyi unutmayın.` });
  }

  /* Moving */

  function place(key: string, target: Drop) {
    if (key === target.key) return;
    const { tree, node } = removeNode(draft.tree, key);
    if (!node) return;
    const topIndex = tree.findIndex((item) => item.key === target.key);
    const parent = tree.find((item) => item.children.some((child) => child.key === target.key));
    const intoChildren = (parentNode: TreeNode, at: number) => {
      if (node.children.length) {
        setMessage({ tone: "error", text: `Alt menüsü olan bir öğe başka bir öğenin altına taşınamaz (en fazla ${meta.maxDepth} seviye).` });
        return null;
      }
      const children = [...parentNode.children];
      children.splice(at, 0, { ...node, children: [] });
      return tree.map((item) => (item.key === parentNode.key ? { ...item, children } : item));
    };
    let next: TreeNode[] | null = null;
    if (topIndex >= 0 && target.nest) {
      const host = tree[topIndex];
      next = intoChildren(host, target.zone === "before" ? 0 : host.children.length);
    } else if (topIndex >= 0) {
      next = [...tree];
      next.splice(target.zone === "before" ? topIndex : topIndex + 1, 0, node);
    } else if (parent) {
      const at = parent.children.findIndex((child) => child.key === target.key);
      next = intoChildren(parent, target.zone === "before" ? at : at + 1);
    }
    if (next) setTree(next);
  }

  function nudge(key: string, step: -1 | 1) {
    const top = draft.tree.findIndex((node) => node.key === key);
    if (top >= 0) {
      if (top + step < 0 || top + step >= draft.tree.length) return;
      const next = [...draft.tree];
      [next[top], next[top + step]] = [next[top + step], next[top]];
      setTree(next);
      return;
    }
    setTree(draft.tree.map((node) => {
      const at = node.children.findIndex((child) => child.key === key);
      if (at < 0 || at + step < 0 || at + step >= node.children.length) return node;
      const children = [...node.children];
      [children[at], children[at + step]] = [children[at + step], children[at]];
      return { ...node, children };
    }));
  }

  function indent(key: string) {
    const top = draft.tree.findIndex((node) => node.key === key);
    if (top <= 0) return;
    place(key, { key: draft.tree[top - 1].key, zone: "after", nest: true });
  }

  function outdent(key: string) {
    const parent = draft.tree.find((node) => node.children.some((child) => child.key === key));
    if (parent) place(key, { key: parent.key, zone: "after", nest: false });
  }

  const locationOwner = (value: Location) => menus.find((menu) => menu.location === value && menu.id !== selected);

  return (
    <div className="menu-page">
      <div className="admin-top menu-top">
        <h1>Menüler</h1>
        {dirty ? <span className="settings-dirty">Kaydedilmemiş değişiklik var</span> : null}
        {canEdit ? <button className="green-btn" type="button" disabled={busy || (!dirty && selected !== NEW)} onClick={() => void save()}>{busy ? "Kaydediliyor…" : "Kaydet"}</button> : null}
      </div>
      {message ? <p className={`settings-message is-${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>{message.text}</p> : null}

      <section className="menu-card menu-pick">
        <label className="field">
          <span>Düzenlenen menü</span>
          <select value={selected} onChange={(event) => void openMenu(event.target.value)}>
            {selected === NEW ? <option value={NEW}>Yeni menü</option> : null}
            {menus.map((menu) => <option key={menu.id} value={menu.id}>{menu.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Görüneceği yer</span>
          <select value={draft.location ?? ""} disabled={!canEdit} onChange={(event) => setDraft((prev) => ({ ...prev, location: (event.target.value || null) as Location | null }))}>
            <option value="">Hiçbir yerde (görünmez)</option>
            {locations.map((item) => {
              const owner = locationOwner(item.value);
              return <option key={item.value} value={item.value}>{owner ? `${item.label} — şu an: ${owner.name}` : item.label}</option>;
            })}
          </select>
        </label>
        {canEdit ? <button className="text-btn menu-new" type="button" onClick={() => void openMenu(NEW)}>+ Yeni menü</button> : null}
        <label className="field menu-name">
          <span>Menü adı</span>
          <input value={draft.name} maxLength={60} disabled={!canEdit} placeholder="Örn. Üst menü" onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))} />
          <small className="settings-hint">Footer sütunlarında başlık olarak görünür.</small>
        </label>
        {canEdit && current ? <button className="tax-delete menu-delete" type="button" disabled={busy} onClick={() => void removeMenu()}>Menüyü sil</button> : null}
        {draft.location && locationOwner(draft.location) ? (
          <p className="settings-note menu-pick-note">Kaydedince “{locationOwner(draft.location)!.name}” menüsü bu yerden kaldırılır; her yerde tek menü görünür.</p>
        ) : null}
      </section>

      <div className="menu-layout">
        {canEdit ? <AddPanel sources={sources} onAdd={addNodes} /> : null}

        <section className="menu-card menu-structure">
          <h2>Menü yapısı</h2>
          <p className="menu-hint">Sürükleyin; sağa kaydırınca açılır alt menü olur. En fazla {meta.maxDepth} seviye.</p>
          {rows.length === 0 ? <p className="tax-empty">Menü boş. Soldan öğe ekleyin.</p> : null}
          <ul className="menu-tree" onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as globalThis.Node)) setDrop(null); }}>
            {rows.map(({ node, depth, parent }) => {
              const isDrop = drop?.key === node.key;
              const label = node.label || node.defaultLabel || "(adsız)";
              const open = editing === node.key;
              return (
                <li
                  key={node.key}
                  className={`menu-item depth-${depth}${node.isHidden ? " is-hidden" : ""}${node.problem ? " has-problem" : ""}${dragging === node.key ? " is-dragging" : ""}${isDrop ? ` is-drop-${drop.zone}${drop.nest ? " is-drop-nest" : ""}` : ""}`}
                  draggable={canEdit && !open}
                  onDragStart={(event) => { setDragging(node.key); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", node.key); }}
                  onDragEnd={() => { setDragging(null); setDrop(null); }}
                  onDragOver={(event) => {
                    if (!dragging || dragging === node.key) return;
                    event.preventDefault();
                    const box = event.currentTarget.getBoundingClientRect();
                    const list = event.currentTarget.parentElement!.getBoundingClientRect();
                    const zone = event.clientY - box.top < box.height / 2 ? "before" : "after";
                    const nest = depth === 2 || event.clientX - list.left > NEST_OFFSET * 2;
                    if (drop?.key !== node.key || drop.zone !== zone || drop.nest !== nest) setDrop({ key: node.key, zone, nest });
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (dragging && drop) place(dragging, drop);
                    setDragging(null);
                    setDrop(null);
                  }}
                >
                  <div className="menu-item-row">
                    {canEdit ? <DragHandle /> : null}
                    <button type="button" className="menu-item-main" aria-expanded={open} onClick={() => setEditing(open ? null : node.key)}>
                      <span className="menu-item-label">{label}</span>
                      {node.problem ? <span className="menu-warn" title={node.problem}>⚠ {node.problem}</span> : null}
                      <span className="menu-item-type">{node.isHidden ? "Gizli" : TYPE_LABELS[node.type]}</span>
                    </button>
                    {canEdit ? (
                      <span className="tax-nudge">
                        <button type="button" aria-label={`${label} yukarı`} onClick={() => nudge(node.key, -1)}>↑</button>
                        <button type="button" aria-label={`${label} aşağı`} onClick={() => nudge(node.key, 1)}>↓</button>
                        {depth === 1
                          ? <button type="button" aria-label={`${label} alt menü yap`} disabled={!draft.tree.length || draft.tree[0].key === node.key || node.children.length > 0} onClick={() => indent(node.key)}>→</button>
                          : <button type="button" aria-label={`${label} alt menüden çıkar`} onClick={() => outdent(node.key)}>←</button>}
                      </span>
                    ) : null}
                  </div>
                  {open ? (
                    <fieldset className="menu-item-edit" disabled={!canEdit}>
                      <label className="field">
                        <span>Görünen ad</span>
                        <input value={node.label} maxLength={80} placeholder={node.defaultLabel || "Bağlantı adı"} onChange={(event) => setTree(updateNode(draft.tree, node.key, { label: event.target.value }))} />
                        {node.type !== "CUSTOM" ? <small className="settings-hint">Boş bırakılırsa bağlı kaydın adı kullanılır.</small> : null}
                      </label>
                      {node.type === "CUSTOM" ? (
                        <label className="field">
                          <span>Bağlantı adresi</span>
                          <input value={node.url ?? ""} maxLength={500} placeholder="/urunler veya https://…" onChange={(event) => setTree(updateNode(draft.tree, node.key, { url: event.target.value }))} />
                          {node.url && !safeUrl(node.url) ? <span className="field-error" role="alert">Güvenli değil: “/” ile başlayan site içi adres, https://, mailto: veya tel: kullanın.</span> : null}
                        </label>
                      ) : null}
                      <div className="menu-item-checks">
                        <label><input type="checkbox" checked={node.openInNewTab} onChange={(event) => setTree(updateNode(draft.tree, node.key, { openInNewTab: event.target.checked }))} /> Yeni sekmede aç</label>
                        <label><input type="checkbox" checked={node.isHidden} onChange={(event) => setTree(updateNode(draft.tree, node.key, { isHidden: event.target.checked }))} /> Gizle</label>
                        <button
                          type="button"
                          className="tax-remove"
                          onClick={() => {
                            const children = node.children.length ? ` Altındaki ${node.children.length} öğe de çıkarılır.` : "";
                            if (children && !window.confirm(`“${label}” menüden çıkarılsın mı?${children}`)) return;
                            setTree(removeNode(draft.tree, node.key).tree);
                            setEditing(null);
                          }}
                        >
                          Menüden çıkar
                        </button>
                      </div>
                      {parent ? <p className="settings-note">“{parent.label || parent.defaultLabel}” altında açılır menüde görünür.</p> : null}
                    </fieldset>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}

function AddPanel({ sources, onAdd }: { sources: MenuSources; onAdd: (nodes: Array<Omit<TreeNode, "key" | "children">>) => void }) {
  const [open, setOpen] = useState<"categories" | "collections" | "pages" | "custom">("categories");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");

  const categoryRows = useMemo(() => {
    const out: Array<{ id: string; name: string; depth: number; isVisible: boolean }> = [];
    const walk = (parentId: string | null, depth: number) => {
      for (const row of sources.categories.filter((item) => item.parentId === parentId)) {
        out.push({ id: row.id, name: row.name, depth, isVisible: row.isVisible });
        walk(row.id, depth + 1);
      }
    };
    walk(null, 1);
    return out;
  }, [sources.categories]);

  const toggle = (key: string) => setChecked((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const blank = { categoryId: null, collectionId: null, pageId: null, pageKey: null, url: null, label: "", openInNewTab: false, isHidden: false };

  function addChecked(kind: "categories" | "collections" | "pages") {
    const nodes: Array<Omit<TreeNode, "key" | "children">> = [];
    if (kind === "categories") {
      for (const row of categoryRows.filter((item) => checked.has(`c:${item.id}`))) {
        nodes.push({ ...blank, type: "CATEGORY", categoryId: row.id, defaultLabel: row.name, problem: row.isVisible ? null : "Bağlı kategori mağazada gizli." });
      }
    } else if (kind === "collections") {
      for (const row of sources.collections.filter((item) => checked.has(`k:${item.id}`))) {
        nodes.push({ ...blank, type: "COLLECTION", collectionId: row.id, defaultLabel: row.name, problem: row.isVisible ? null : "Bağlı koleksiyon mağazada gizli." });
      }
    } else {
      for (const row of sources.pages.filter((item) => checked.has(`p:${item.pageKey ?? item.pageId}`))) {
        nodes.push({ ...blank, type: "PAGE", pageKey: row.pageKey, pageId: row.pageId, defaultLabel: row.title, problem: row.live ? null : "Bağlı sayfa yayında değil." });
      }
    }
    onAdd(nodes);
    setChecked(new Set());
  }

  function addCustom() {
    if (!label.trim()) {
      setError("Bağlantı adı girin.");
      return;
    }
    if (!safeUrl(url)) {
      setError("Güvenli değil: “/” ile başlayan site içi adres, https://, mailto: veya tel: kullanın.");
      return;
    }
    onAdd([{ ...blank, type: "CUSTOM", url: url.trim(), label: label.trim(), defaultLabel: "", problem: null }]);
    setUrl("");
    setLabel("");
    setError("");
  }

  const section = (key: typeof open, title: string, body: React.ReactNode) => (
    <div className={`menu-acc${open === key ? " is-open" : ""}`}>
      <button type="button" className="menu-acc-head" aria-expanded={open === key} onClick={() => setOpen(key)}>
        <span>{title}</span>
        <span className="drawer-chevron" aria-hidden="true" />
      </button>
      {open === key ? <div className="menu-acc-body">{body}</div> : null}
    </div>
  );

  const addButton = (kind: "categories" | "collections" | "pages", prefix: string) => (
    <button className="text-btn" type="button" disabled={![...checked].some((key) => key.startsWith(prefix))} onClick={() => addChecked(kind)}>Menüye ekle</button>
  );

  return (
    <section className="menu-card menu-add">
      <h2>Menüye ekle</h2>
      {section("categories", "Kategoriler", (
        <>
          {categoryRows.length === 0 ? <p className="tax-empty">Kategori yok.</p> : null}
          {categoryRows.map((row) => (
            <label key={row.id} className="menu-check" style={{ paddingLeft: `${(row.depth - 1) * 1.1}rem` }}>
              <input type="checkbox" checked={checked.has(`c:${row.id}`)} onChange={() => toggle(`c:${row.id}`)} />
              <span>{row.name}</span>
              {row.isVisible ? null : <span className="tax-badge">Gizli</span>}
            </label>
          ))}
          {addButton("categories", "c:")}
        </>
      ))}
      {section("collections", "Koleksiyonlar", (
        <>
          {sources.collections.length === 0 ? <p className="tax-empty">Koleksiyon yok.</p> : null}
          {sources.collections.map((row) => (
            <label key={row.id} className="menu-check">
              <input type="checkbox" checked={checked.has(`k:${row.id}`)} onChange={() => toggle(`k:${row.id}`)} />
              <span>{row.name}</span>
              {row.isVisible ? null : <span className="tax-badge">Gizli</span>}
            </label>
          ))}
          {addButton("collections", "k:")}
        </>
      ))}
      {section("pages", "Sayfalar", (
        <>
          {sources.pages.map((row) => {
            const key = `p:${row.pageKey ?? row.pageId}`;
            return (
              <label key={key} className="menu-check">
                <input type="checkbox" checked={checked.has(key)} onChange={() => toggle(key)} />
                <span>{row.title}</span>
                {row.live ? null : <span className="tax-badge">Taslak</span>}
              </label>
            );
          })}
          {addButton("pages", "p:")}
        </>
      ))}
      {section("custom", "Özel bağlantı", (
        <>
          <label className="field">
            <span>Adres</span>
            <input value={url} maxLength={500} placeholder="/urunler veya https://…" onChange={(event) => { setUrl(event.target.value); setError(""); }} />
          </label>
          <label className="field">
            <span>Bağlantı adı</span>
            <input value={label} maxLength={80} onChange={(event) => { setLabel(event.target.value); setError(""); }} />
          </label>
          {error ? <span className="field-error" role="alert">{error}</span> : null}
          <button className="text-btn" type="button" onClick={addCustom}>Menüye ekle</button>
        </>
      ))}
    </section>
  );
}
