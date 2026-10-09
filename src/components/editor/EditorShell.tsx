"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ApiError, browserApi } from "@/lib/api";
import { describeEditorNode } from "@/lib/editor-catalog";
import { BoxSettings, ImageSettings, LinkSettings, NodeSettings, TextSettings, type BoxChild, type NodeStylePatch } from "@/components/editor/EditorPanels";
import { applyBoxStyle, BOX_DEVICE_KEYS, boxKind, clampBoxNumber, isProductCardBox, shadowCss, type EditorBoxStyle, type EditorBoxValues } from "@/lib/editor-boxes";
import { clearForDevice, hasDeviceValues, MIN_DEVICE_FONT, resetForDevice, resolveForDevice, writeForDevice } from "@/lib/editor-devices";
import { applyImagePatch, clampImageNumber, IMAGE_DEVICE_KEYS, imageKind, imageTarget, mediaUrl, readFocus, type EditorImagePatch, type EditorImageStyle } from "@/lib/editor-images";
import { NodeIconSvg } from "@/lib/editor-icons";
import { DESKTOP_MIN_WIDTH, initialDevice, PREVIEW_DEVICES, startPreviewCss, type PreviewDevice } from "@/lib/editor-preview";
import { applyLinkPatch, LINK_DEVICE_KEYS, linkKind, type EditorLinkPatch, type EditorLinkStyle } from "@/lib/editor-links";
import {
  applyCopyPatch,
  COPY_DEVICE_KEYS,
  copyWidthFromPx,
  COPY_FONTS,
  editorSignature,
  emptyDraft,
  HOME_EDITOR_SLUG,
  homeEditorDocument,
  isEditableCopy,
  readHomeEditor,
  resolveTextStyle,
  sameEditorDraft,
  type EditorCopyPatch,
  type EditorTextStyle,
  type EditorDraft,
} from "@/lib/editor-elements";
import {
  canHoldNodes,
  childrenOf,
  clampNodeBox,
  createNode,
  descendantIds,
  duplicateNode,
  findNode,
  innerSize,
  isNodeId,
  deviceStyleKeys,
  hasLayout,
  MAX_NODES,
  NODE_LABELS,
  nodeBounds,
  nodeBox,
  nodeEditorId,
  nodeForDevice,
  nodeFrame,
  nodeScale,
  parentEditorId,
  removeNode,
  reorderNode,
  sameBox,
  type EditorNode,
  type NodeBox,
  type NodeDeviceStyle,
  type NodeOrderMove,
  type NodeSize,
  type NodeType,
} from "@/lib/editor-nodes";

type Box = { top: number; left: number; width: number; height: number };
type CopyValues = { text?: string } & EditorTextStyle;
type LinkValues = { text?: string; href?: string } & EditorLinkStyle;
type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
type StoredRevision = { id: string; version: number; document: unknown };
type History = { past: EditorDraft[]; future: EditorDraft[]; previous: EditorDraft | null; restoring: EditorDraft | null; at: number; force: boolean; gesture: boolean };

const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const ADD_TYPES: NodeType[] = ["container", "text", "image", "button", "icon"];
const HISTORY_LIMIT = 100;
// Typing or nudging within this window is one undo step.
const HISTORY_BURST_MS = 700;
const DRAG_THRESHOLD = 4;
// Hosts with a photo behind them get light text by default.
const LIGHT_HOST = /^home\.(?:hero\.visual|story|collections\.card\.[a-z0-9-]+|promos\.card\.[a-z0-9-]+)$/;

function sameParts(left: EditorDraft, right: EditorDraft) {
  return left.copies === right.copies && left.nodes === right.nodes && left.links === right.links && left.images === right.images && left.boxes === right.boxes;
}

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || !!target.closest("input, textarea, select, [contenteditable='true']"));
}

// Default sizes of the .editor-node text and button rules in editor.css.
const NODE_DEFAULT_FONT = { text: 16.8, button: 15.2 };

// On tablet and phone a fitted frame is scaled down; text there still shows at a readable size.
function readableFont(size: number | undefined, kind: "text" | "button", device: PreviewDevice, scale: number) {
  const base = size ?? NODE_DEFAULT_FONT[kind];
  if (device === "desktop" || base * scale >= MIN_DEVICE_FONT) return size;
  return Math.ceil((MIN_DEVICE_FONT / scale) * 10) / 10;
}

function nodeStyle(source: EditorNode, device: PreviewDevice, scale: number): React.CSSProperties {
  const node = nodeForDevice(source, device);
  const box = nodeBox(node, device);
  const style: React.CSSProperties = { left: box.x, top: box.y, width: box.width, height: box.height, zIndex: node.order + 1 };
  if (node.type === "container") {
    const css = node.style ?? {};
    if (css.background) style.background = css.background;
    if (css.borderWidth) {
      style.borderStyle = "solid";
      style.borderWidth = css.borderWidth;
      style.borderColor = css.borderColor ?? "#e4d8c4";
    }
    if (css.radius != null) style.borderRadius = css.radius;
    if (css.opacity != null) style.opacity = css.opacity / 100;
    if (css.shadow) style.boxShadow = shadowCss(css.shadow);
    return style;
  }
  if (node.type === "image") {
    const css = node.style ?? {};
    if (css.radius != null) style.borderRadius = css.radius;
    if (css.borderWidth) {
      style.borderStyle = "solid";
      style.borderWidth = css.borderWidth;
      style.borderColor = css.borderColor ?? "#e4d8c4";
    }
    return style;
  }
  if (node.type === "button") {
    const css = node.style ?? {};
    style.background = css.background ?? "#1e4a38";
    style.color = css.color ?? "#fffdf8";
    const buttonFont = readableFont(css.fontSize, "button", device, scale);
    if (buttonFont) style.fontSize = buttonFont;
    if (css.fontWeight) style.fontWeight = css.fontWeight;
    style.borderRadius = css.radius ?? 999;
    if (css.borderWidth) {
      style.borderStyle = "solid";
      style.borderWidth = css.borderWidth;
      style.borderColor = css.borderColor ?? "#1e4a38";
    }
    return style;
  }
  if (node.type === "icon") {
    style.color = node.style?.color ?? "#1e4a38";
    return style;
  }
  const css = node.style ?? {};
  if (css.color) {
    style.color = css.color;
    style.textShadow = "none";
  }
  const textFont = readableFont(css.fontSize, "text", device, scale);
  if (textFont) style.fontSize = textFont;
  if (css.fontWeight) style.fontWeight = css.fontWeight;
  if (css.align) style.textAlign = css.align;
  if (css.fontFamily) style.fontFamily = COPY_FONTS[css.fontFamily].stack;
  if (css.lineHeight) style.lineHeight = css.lineHeight;
  return style;
}

function NodeContent({ node, nodes, device, scale, onPointerDown }: NodeViewProps) {
  switch (node.type) {
    case "text":
      return <>{node.text}</>;
    case "button":
      return <span className="editor-node-label">{node.text}</span>;
    case "icon":
      return <NodeIconSvg icon={node.icon} />;
    case "image": {
      if (!node.mediaId) return <span className="editor-node-placeholder">Görsel seçin</span>;
      const css = node.style ?? {};
      return (
        <img
          src={mediaUrl(node.mediaId)}
          alt={node.alt ?? ""}
          draggable={false}
          style={{ objectFit: css.fit ?? "cover", objectPosition: `${css.focusX ?? 50}% ${css.focusY ?? 50}%` }}
        />
      );
    }
    default:
      return <>{childrenOf(nodes, node.id).map((child) => <NodeView key={child.id} node={child} nodes={nodes} device={device} scale={scale} onPointerDown={onPointerDown} />)}</>;
  }
}

type NodeViewProps = { node: EditorNode; nodes: EditorNode[]; device: PreviewDevice; scale: number; onPointerDown: (event: React.PointerEvent, node: EditorNode) => void };

function NodeView({ node, nodes, device, scale, onPointerDown }: NodeViewProps) {
  return (
    <div className={`editor-node is-${node.type}`} data-editor-id={nodeEditorId(node.id)} style={nodeStyle(node, device, scale)} onPointerDown={(event) => onPointerDown(event, node)}>
      <NodeContent node={node} nodes={nodes} device={device} scale={scale} onPointerDown={onPointerDown} />
    </div>
  );
}

class UnverifiedSave extends Error {}

// ?taslak=editor-deneme… opens a separate draft so the editor can be tried without touching the real homepage draft.
const TEST_TARGET = /^editor-deneme(?:-[a-z0-9]{1,20})?$/;

function editorTarget() {
  const requested = new URLSearchParams(window.location.search).get("taslak");
  return requested && TEST_TARGET.test(requested) ? requested : HOME_EDITOR_SLUG;
}

async function readHomePage(id: string, slug: string) {
  const body = await browserApi<{ data?: { id?: string; slug?: string; revisions?: StoredRevision[] } }>(`/admin/pages/${encodeURIComponent(id)}`);
  const page = body?.data;
  if (!page || page.id !== id || page.slug !== slug || !Array.isArray(page.revisions)) {
    throw new UnverifiedSave("Sunucudan beklenmeyen yanıt geldi.");
  }
  return { id, latest: page.revisions[0] as StoredRevision | undefined };
}

function loadErrorText(error: unknown) {
  if (error instanceof ApiError && error.status === 401) return "Oturumun süresi dolmuş. Yeniden giriş yapıp sayfayı yenileyin.";
  if (error instanceof ApiError && error.status === 403) return "Bu taslağı açma yetkiniz yok.";
  return "Taslak yüklenemedi. Değişiklikler kaydedilemez; sayfayı yenileyin.";
}

function saveErrorText(error: unknown) {
  const kept = "Ekrandaki değişiklikler duruyor.";
  if (error instanceof ApiError) {
    if (error.status === 401) return `Oturumun süresi dolmuş; taslak kaydedilmedi. Yeni sekmede yeniden giriş yapıp tekrar kaydedin. ${kept}`;
    if (error.status === 403) return `Bu taslağı kaydetme yetkiniz yok; taslak kaydedilmedi. ${kept}`;
    if (error.status === 404) return `Taslak sunucuda bulunamadı; kaydedilmedi. Yeniden Taslak Kaydet'e basarsanız yeni taslak oluşturulur. ${kept}`;
    if (error.code === "REVISION_CONFLICT" || error.code === "SLUG_TAKEN") {
      return `Bu taslak başka bir sekmede değişti; kaydedilmedi. ${kept} Diğer taslağı görmek için sayfayı yeniden yükleyin.`;
    }
    if (error.status === 400) return `Taslak kaydedilmedi: ${error.message} ${kept}`;
    return `Sunucu hatası (${error.status}); taslak kaydedilmedi. ${kept} Biraz sonra tekrar deneyin.`;
  }
  if (error instanceof UnverifiedSave) return `Kayıt sunucuda doğrulanamadı. ${kept} Tekrar kaydedin.`;
  return `Sunucuya ulaşılamadı; taslak kaydedilmedi. ${kept}`;
}

function isVisible(element: HTMLElement) {
  const style = getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function visibleNode(start: Element | null) {
  let node = start?.closest<HTMLElement>("[data-editor-id]") ?? null;
  while (node) {
    if (isVisible(node)) return node;
    node = node.parentElement?.closest<HTMLElement>("[data-editor-id]") ?? null;
  }
  return null;
}

function previewText(element: HTMLElement) {
  const direct = [...element.childNodes]
    .filter((item) => item.nodeType === Node.TEXT_NODE)
    .map((item) => item.textContent ?? "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const text = direct || element.getAttribute("aria-label") || "";
  if (text) return text.slice(0, 80);
  if (element.children.length > 3) return "";
  const all = (element.textContent ?? "").replace(/\s+/g, " ").trim();
  return all.length > 0 && all.length <= 80 ? all : "";
}

function elementById(stage: HTMLElement | null, id: string) {
  return stage?.querySelector<HTMLElement>(`[data-editor-id="${CSS.escape(id)}"]`) ?? null;
}

export function EditorShell({ children }: { children: React.ReactNode }) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const attachStage = useCallback((element: HTMLDivElement | null) => {
    stageRef.current = element;
    setStage(element);
  }, []);
  const appliedRef = useRef(new Set<string>());
  const appliedLinksRef = useRef(new Set<string>());
  const appliedImagesRef = useRef(new Set<string>());
  const appliedBoxesRef = useRef(new Set<string>());
  const [selected, setSelected] = useState<string | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [preview, setPreview] = useState("");
  const [parentNote, setParentNote] = useState("");
  const [nodes, setNodes] = useState<EditorNode[]>([]);
  const [, setTick] = useState(0);
  const [historySize, setHistorySize] = useState({ undo: 0, redo: 0 });
  const historyRef = useRef<History>({ past: [], future: [], previous: null, restoring: null, at: 0, force: false, gesture: false });
  const positionedRef = useRef(new Set<string>());
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const desktop = device === "desktop";
  const [addOpen, setAddOpen] = useState(false);
  const [cardBox, setCardBox] = useState<Box | null>(null);
  const [copies, setCopies] = useState<Record<string, EditorCopyPatch>>({});
  const [links, setLinks] = useState<Record<string, EditorLinkPatch>>({});
  const [images, setImages] = useState<Record<string, EditorImagePatch>>({});
  const [boxes, setBoxes] = useState<Record<string, EditorBoxStyle>>({});
  const [target, setTarget] = useState(HOME_EDITOR_SLUG);
  const [pageId, setPageId] = useState<string | null>(null);
  const [baseVersion, setBaseVersion] = useState(0);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ tone: "info" | "ok" | "error"; text: string }>({ tone: "info", text: "Taslak yükleniyor…" });
  const [savedSignature, setSavedSignature] = useState(() => editorSignature(emptyDraft()));
  const draft = useMemo<EditorDraft>(() => ({ copies, nodes, links, images, boxes }), [copies, nodes, links, images, boxes]);
  const signature = useMemo(() => editorSignature(draft), [draft]);
  const dirty = ready && signature !== savedSignature;

  const selectedNode = findNode(nodes, selected);
  const addTarget = desktop && ready && canHoldNodes(nodes, selected) ? selected : null;

  useEffect(() => {
    const history = historyRef.current;
    if (!ready) return;
    if (history.restoring) {
      if (sameParts(history.restoring, draft)) {
        history.restoring = null;
        history.previous = draft;
      }
      return;
    }
    if (!history.previous) {
      history.previous = draft;
      return;
    }
    if (sameParts(history.previous, draft)) return;
    const now = Date.now();
    if (history.force || (!history.gesture && now - history.at > HISTORY_BURST_MS)) {
      history.past.push(history.previous);
      if (history.past.length > HISTORY_LIMIT) history.past.shift();
      history.future = [];
    }
    history.force = false;
    history.at = now;
    history.previous = draft;
    setHistorySize({ undo: history.past.length, redo: 0 });
  }, [draft, ready]);

  if (selected?.startsWith("node.") && !selectedNode) setSelected(null);

  // Free nodes are absolutely positioned inside their host, so a static host becomes the positioning box.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const hosts = new Set(nodes.filter((node) => !isNodeId(node.parentId)).map((node) => node.parentId));
    const next = new Set<string>();
    for (const id of positionedRef.current) {
      const element = elementById(stage, id);
      if (!element) continue;
      if (hosts.has(id)) next.add(id);
      else element.style.position = "";
    }
    for (const id of hosts) {
      const element = elementById(stage, id);
      if (!element || next.has(id) || getComputedStyle(element).position !== "static") continue;
      element.style.position = "relative";
      next.add(id);
    }
    positionedRef.current = next;
  }, [nodes, ready, device]);

  function markStep() {
    historyRef.current.force = true;
  }

  function restore(next: EditorDraft) {
    historyRef.current.restoring = next;
    setCopies(next.copies);
    setNodes(next.nodes);
    setLinks(next.links);
    setImages(next.images);
    setBoxes(next.boxes);
  }

  function undo() {
    const history = historyRef.current;
    const previous = history.past.pop();
    if (!previous || history.restoring) return;
    history.future.push(draft);
    history.at = 0;
    restore(previous);
    setHistorySize({ undo: history.past.length, redo: history.future.length });
  }

  function redo() {
    const history = historyRef.current;
    const next = history.future.pop();
    if (!next || history.restoring) return;
    history.past.push(draft);
    history.at = 0;
    restore(next);
    setHistorySize({ undo: history.past.length, redo: history.future.length });
  }

  function resetHistory() {
    historyRef.current = { past: [], future: [], previous: null, restoring: null, at: 0, force: false, gesture: false };
    setHistorySize({ undo: 0, redo: 0 });
  }

  function measure(id: string | null) {
    const stage = stageRef.current;
    if (!id || !stage) {
      setBox(null);
      setPreview("");
      return;
    }
    const element = elementById(stage, id);
    if (!element || !isVisible(element)) {
      setBox(null);
      setPreview("");
      return;
    }
    const rect = element.getBoundingClientRect();
    const bounds = stage.getBoundingClientRect();
    const top = Math.max(rect.top, bounds.top);
    const left = Math.max(rect.left, bounds.left);
    const right = Math.min(rect.right, bounds.right);
    const bottom = Math.min(rect.bottom, bounds.bottom);
    setPreview(previewText(element));
    if (right <= left || bottom <= top) {
      setBox(null);
      return;
    }
    setBox({ top, left, width: right - left, height: bottom - top });
  }

  function measureCard(id: string | null) {
    const stage = stageRef.current;
    const element = id ? elementById(stage, id) : null;
    if (!stage || !element || !isVisible(element)) {
      setCardBox(null);
      return;
    }
    const rect = element.getBoundingClientRect();
    const bounds = stage.getBoundingClientRect();
    const top = Math.max(rect.top, bounds.top);
    const left = Math.max(rect.left, bounds.left);
    const right = Math.min(rect.right, bounds.right);
    const bottom = Math.min(rect.bottom, bounds.bottom);
    if (right - left < 24 || bottom - top < 24) {
      setCardBox(null);
      return;
    }
    setCardBox({ top: top + 8, left: left + 8, width: 0, height: 0 });
  }

  useEffect(() => {
    measure(selected);
    measureCard(addTarget);
    const stage = stageRef.current;
    if (!stage) return;
    const update = () => {
      measure(selected);
      measureCard(addTarget);
    };
    // Node scale depends on the host size, so a resize re-renders the portals.
    const resize = () => {
      setTick((tick) => tick + 1);
      update();
    };
    stage.addEventListener("scroll", update, true);
    window.addEventListener("resize", resize);
    return () => {
      stage.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", resize);
    };
  }, [selected, addTarget, nodes, device, copies, links, images, boxes]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    for (const id of appliedRef.current) {
      if (copies[id]) continue;
      const element = elementById(stage, id);
      if (element) applyCopyPatch(element, {}, device);
    }
    for (const [id, patch] of Object.entries(copies)) {
      const element = elementById(stage, id);
      if (element) applyCopyPatch(element, patch, device);
    }
    appliedRef.current = new Set(Object.keys(copies));
  }, [copies, device]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    for (const id of appliedLinksRef.current) {
      const kind = linkKind(id);
      const element = elementById(stage, id);
      if (!links[id] && kind && element) applyLinkPatch(element, {}, kind, device);
    }
    for (const [id, patch] of Object.entries(links)) {
      const kind = linkKind(id);
      const element = elementById(stage, id);
      if (kind && element) applyLinkPatch(element, patch, kind, device);
    }
    appliedLinksRef.current = new Set(Object.keys(links));
  }, [links, device]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    for (const id of appliedImagesRef.current) {
      const kind = imageKind(id);
      const element = elementById(stage, id);
      if (!images[id] && kind && element) applyImagePatch(element, {}, kind, device);
    }
    for (const [id, patch] of Object.entries(images)) {
      const kind = imageKind(id);
      const element = elementById(stage, id);
      if (kind && element) applyImagePatch(element, patch, kind, device);
    }
    appliedImagesRef.current = new Set(Object.keys(images));
  }, [images, device]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    for (const id of appliedBoxesRef.current) {
      const element = elementById(stage, id);
      if (!boxes[id] && element) applyBoxStyle(element, {}, device);
    }
    for (const [id, patch] of Object.entries(boxes)) {
      const element = boxKind(id) ? elementById(stage, id) : null;
      if (element) applyBoxStyle(element, patch, device);
    }
    appliedBoxesRef.current = new Set(Object.keys(boxes));
  }, [boxes, device]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const slug = editorTarget();
        if (!cancel) setTarget(slug);
        const list = await browserApi<{ data?: { id: string; slug: string }[] }>("/admin/pages");
        if (!Array.isArray(list?.data)) throw new UnverifiedSave("Sunucudan beklenmeyen yanıt geldi.");
        const found = list.data.find((item) => item.slug === slug);
        if (!found) {
          if (cancel) return;
          setSavedSignature(editorSignature(emptyDraft()));
          setBanner({ tone: "info", text: "Yayında değil. Henüz kayıtlı taslak yok." });
          setReady(true);
          return;
        }
        const { latest } = await readHomePage(found.id, slug);
        const draft = readHomeEditor(latest?.document);
        if (cancel) return;
        setPageId(found.id);
        setBaseVersion(latest?.version ?? 0);
        resetHistory();
        setCopies(draft.copies);
        setNodes(draft.nodes);
        setLinks(draft.links);
        setImages(draft.images);
        setBoxes(draft.boxes);
        setSavedSignature(editorSignature(draft));
        setBanner({ tone: "info", text: `Kayıtlı taslak yüklendi (sürüm ${latest?.version ?? 0}). Yayında değil.` });
        setReady(true);
      } catch (error) {
        if (cancel) return;
        setBanner({ tone: "error", text: loadErrorText(error) });
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const status = ready && !saving && dirty && banner.tone !== "error" ? { tone: "info" as const, text: "Kaydedilmemiş değişiklik var." } : banner;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // The store's screen-width rules follow the preview width while the editor is open.
  useLayoutEffect(() => {
    // The window width is only known after hydration, so the first device cannot come from state init.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDevice(initialDevice());
    return startPreviewCss();
  }, []);

  // Host sizes change with the preview width, and portals read them while rendering.
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTick((tick) => tick + 1);
  }, [device]);

  function withBox(node: EditorNode, box: NodeBox, frame?: NodeSize): EditorNode {
    if (device === "desktop") return { ...node, ...(frame ? { frame } : {}), desktop: box };
    const layout = node[device];
    const nextFrame = frame ?? layout?.frame;
    return { ...node, [device]: { ...layout, box, ...(nextFrame ? { frame: nextFrame } : {}) } };
  }

  function resetDeviceLayout(id: string) {
    if (device === "desktop") return;
    markStep();
    setNodes((list) =>
      list.map((node) => {
        if (node.id !== id) return node;
        const next = { ...node };
        delete next[device];
        return next;
      }),
    );
  }

  function choose(id: string | null) {
    setParentNote("");
    setAddOpen(false);
    setSelected(id);
  }

  function onClickCapture(event: React.MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.closest("[data-editor-ui]")) return;
    event.preventDefault();
    event.stopPropagation();
    setAddOpen(false);
    const node = visibleNode(target);
    choose(node?.getAttribute("data-editor-id") ?? null);
  }

  function selectParent() {
    if (!selected) return;
    const node = findNode(nodes, selected);
    const parent = node ? parentEditorId(node) : describeEditorNode(selected)?.parent;
    if (!parent) return;
    const element = elementById(stageRef.current, parent);
    if (!element || !isVisible(element)) {
      setParentNote("Üst öğe bu genişlikte görünmüyor.");
      return;
    }
    choose(parent);
  }

  function hostSize(node: EditorNode): NodeSize | null {
    const host = elementById(stage, node.parentId);
    return host && host.clientWidth > 0 && host.clientHeight > 0 ? { width: host.clientWidth, height: host.clientHeight } : null;
  }

  // Positions are stored in desktop pixels of the box the node lives in: the parent container's
  // inner size, or for top-level nodes the frame (the host size when the node was last edited).
  function editBounds(node: EditorNode, list: EditorNode[]): { bounds: NodeSize; frame?: NodeSize } {
    if (isNodeId(node.parentId)) return { bounds: nodeBounds(list, node, device) };
    const host = hostSize(node);
    const scale = host ? nodeScale(node, host, device) : 1;
    if (host && scale >= 1) return { bounds: host, frame: host };
    // Keep the scale the user currently sees, so the first edit on a device does not make anything jump.
    const frame = host && !hasLayout(node, device) ? { width: Math.round(host.width / scale), height: Math.round(host.height / scale) } : nodeFrame(node, device);
    return { bounds: frame, frame };
  }

  function writeNodeBox(id: string, box: NodeBox) {
    setNodes((list) => {
      const current = list.find((item) => item.id === id);
      if (!current) return list;
      const { bounds, frame } = editBounds(current, list);
      // Tablet and phone edits only touch that device's layout; desktop coordinates stay as they are.
      const updated = withBox(current, clampNodeBox(box, bounds), frame);
      // A smaller container keeps its direct children inside it instead of clipping them.
      const inner = updated.type === "container" ? innerSize(updated, device) : null;
      return list.map((item) => {
        if (item.id === id) return updated;
        if (!inner || item.parentId !== id) return item;
        const fitted = clampNodeBox(nodeBox(item, device), inner);
        return sameBox(fitted, nodeBox(item, device)) ? item : withBox(item, fitted);
      });
    });
  }

  function updateNode(id: string, change: (node: EditorNode) => EditorNode) {
    setNodes((list) => list.map((item) => (item.id === id ? change(item) : item)));
  }

  // On tablet and phone, font size and line height go to that screen's layout; other styles are shared.
  function updateNodeStyle(id: string, input: NodeStylePatch) {
    const partial = readable(input);
    updateNode(id, (node) => {
      if (device === "desktop") return { ...node, style: { ...node.style, ...partial } } as EditorNode;
      const own: NodeDeviceStyle = {};
      const shared: NodeStylePatch = { ...partial };
      for (const key of deviceStyleKeys(node)) {
        if (partial[key] === undefined) continue;
        own[key] = partial[key];
        delete shared[key];
      }
      const next = { ...node, style: { ...node.style, ...shared } } as EditorNode;
      if (Object.keys(own).length === 0) return next;
      const layout = node[device] ?? { box: nodeBox(node, device) };
      return { ...next, [device]: { ...layout, ...own } };
    });
  }

  function clearNodeStyle(id: string, key: keyof NodeStylePatch) {
    updateNode(id, (node) => {
      const layout = device !== "desktop" ? node[device] : undefined;
      if (device !== "desktop" && (deviceStyleKeys(node) as string[]).includes(key)) {
        if (!layout) return node;
        const nextLayout = { ...layout };
        delete nextLayout[key as keyof NodeDeviceStyle];
        return { ...node, [device]: nextLayout };
      }
      const style = { ...node.style } as NodeStylePatch;
      delete style[key];
      return { ...node, style } as EditorNode;
    });
  }

  // On tablet and phone the font fields show that screen's own values; empty means "as on desktop".
  function nodePanelView(node: EditorNode): EditorNode {
    const keys = deviceStyleKeys(node);
    if (device === "desktop" || keys.length === 0) return node;
    const style = { ...node.style } as NodeStylePatch;
    const layout = node[device];
    for (const key of keys) {
      delete style[key];
      if (layout?.[key] != null) style[key] = layout[key];
    }
    return { ...node, style } as EditorNode;
  }

  function renderedScale(node: EditorNode) {
    const element = elementById(stageRef.current, nodeEditorId(node.id));
    const width = element?.getBoundingClientRect().width ?? 0;
    const box = nodeBox(node, device);
    return width > 0 && box.width > 0 ? width / box.width : 1;
  }

  function trackPointer(event: React.PointerEvent, onMove: (move: PointerEvent) => void) {
    event.preventDefault();
    event.stopPropagation();
    const history = historyRef.current;
    history.force = true;
    history.gesture = true;
    const pointerId = event.pointerId;
    const target = event.currentTarget as HTMLElement;
    try {
      target.setPointerCapture(pointerId);
    } catch {
      // Capture is optional; window listeners still follow the pointer.
    }
    const move = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== pointerId) return;
      onMove(pointerEvent);
    };
    const end = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== pointerId) return;
      history.gesture = false;
      history.at = 0;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }

  // Only an already selected node moves, and only after the pointer travels a few pixels,
  // so a click that selects never shifts anything by accident.
  function onNodePointerDown(event: React.PointerEvent, node: EditorNode) {
    if (event.button !== 0) return;
    event.stopPropagation();
    if (selected !== nodeEditorId(node.id)) return;
    const origin = nodeBox(node, device);
    const scale = renderedScale(node);
    const startX = event.clientX;
    const startY = event.clientY;
    let moving = false;
    trackPointer(event, (move) => {
      if (!moving && Math.hypot(move.clientX - startX, move.clientY - startY) < DRAG_THRESHOLD) return;
      moving = true;
      writeNodeBox(node.id, { ...origin, x: origin.x + (move.clientX - startX) / scale, y: origin.y + (move.clientY - startY) / scale });
    });
  }

  function onNodeResizeStart(event: React.PointerEvent, node: EditorNode, handle: Handle) {
    if (event.button !== 0) return;
    const origin = nodeBox(node, device);
    const scale = renderedScale(node);
    const startX = event.clientX;
    const startY = event.clientY;
    trackPointer(event, (move) => {
      const dx = (move.clientX - startX) / scale;
      const dy = (move.clientY - startY) / scale;
      let { x, y, width, height } = origin;
      if (handle.includes("e")) width = origin.width + dx;
      if (handle.includes("s")) height = origin.height + dy;
      if (handle.includes("w")) {
        width = Math.max(24, origin.width - dx);
        x = origin.x + origin.width - width;
      }
      if (handle.includes("n")) {
        height = Math.max(20, origin.height - dy);
        y = origin.y + origin.height - height;
      }
      if (x < 0) {
        width += x;
        x = 0;
      }
      if (y < 0) {
        height += y;
        y = 0;
      }
      writeNodeBox(node.id, { x, y, width, height });
    });
  }

  function addNode(type: NodeType) {
    if (!addTarget) return;
    const parentNode = findNode(nodes, addTarget);
    const host = parentNode ? null : elementById(stageRef.current, addTarget);
    const bounds = parentNode ? innerSize(parentNode) : host ? { width: host.clientWidth, height: host.clientHeight } : null;
    if (!bounds) return;
    const node = createNode(nodes, type, addTarget, bounds, !parentNode && LIGHT_HOST.test(addTarget));
    if (!node) {
      setBanner({ tone: "error", text: `En fazla ${MAX_NODES} öğe eklenebilir.` });
      return;
    }
    markStep();
    setNodes((list) => [...list, node]);
    choose(nodeEditorId(node.id));
  }

  function duplicateSelected(node: EditorNode) {
    const result = duplicateNode(nodes, node.id);
    if (!result) {
      setBanner({ tone: "error", text: `Çoğaltılamadı: en fazla ${MAX_NODES} öğe olabilir.` });
      return;
    }
    markStep();
    setNodes(result.nodes);
    choose(nodeEditorId(result.copyId));
  }

  function deleteSelected(node: EditorNode) {
    const inside = descendantIds(nodes, node.id).size;
    if (inside > 0 && !window.confirm(`Bu konteyner içindeki ${inside} öğeyle birlikte silinecek. Devam edilsin mi?`)) return;
    markStep();
    setNodes((list) => removeNode(list, node.id));
    choose(parentEditorId(node));
  }

  function orderSelected(node: EditorNode, move: NodeOrderMove) {
    markStep();
    setNodes((list) => reorderNode(list, node.id, move));
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Fields keep the browser's own undo, redo and caret keys.
      if (isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && !event.altKey) {
        if (key === "z" && !event.shiftKey) {
          event.preventDefault();
          undo();
        } else if (key === "y" || (key === "z" && event.shiftKey)) {
          event.preventDefault();
          redo();
        }
        return;
      }
      if (!selectedNode || event.altKey) return;
      const step = event.shiftKey ? 10 : 1;
      const delta = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] }[key];
      if (!delta) return;
      event.preventDefault();
      const current = nodeBox(selectedNode, device);
      writeNodeBox(selectedNode.id, { ...current, x: current.x + delta[0], y: current.y + delta[1] });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function onCopyWidthStart(event: React.PointerEvent, id: string) {
    if (event.button !== 0) return;
    const element = elementById(stageRef.current, id);
    if (!element) return;
    const startWidth = element.getBoundingClientRect().width;
    const startX = event.clientX;
    const unit = resolveTextStyle(copies[id] ?? {}, device).width?.unit ?? "px";
    trackPointer(event, (move) => {
      const width = copyWidthFromPx(startWidth + move.clientX - startX, unit, element);
      setCopies((current) => ({ ...current, [id]: writeForDevice<CopyValues>(current[id], { width }, device, COPY_DEVICE_KEYS) }));
    });
  }

  async function saveDraft() {
    if (!ready || saving || !dirty) return;
    const document = homeEditorDocument(draft);
    const mark = editorSignature(draft);
    setSaving(true);
    setBanner({ tone: "info", text: "Kaydediliyor…" });
    try {
      let id = pageId;
      let revisionId: string | null = null;
      if (!id) {
        const created = await browserApi<{ data?: { id?: string } }>("/admin/pages", {
          method: "POST",
          body: JSON.stringify({ title: target === HOME_EDITOR_SLUG ? "Ana sayfa" : "Editör deneme taslağı", slug: target, document }),
        });
        id = created?.data?.id ?? null;
        if (!id) throw new UnverifiedSave("Sunucu sayfa kimliği döndürmedi.");
        setPageId(id);
        setBaseVersion(1);
      } else {
        const saved = await browserApi<{ data?: { id?: string; pageId?: string; version?: number } }>(
          `/admin/pages/${encodeURIComponent(id)}/revisions`,
          { method: "POST", body: JSON.stringify({ document, baseVersion }) },
        );
        if (!saved?.data?.id || saved.data.pageId !== id || saved.data.version !== baseVersion + 1) {
          throw new UnverifiedSave("Sunucu revizyon bilgisi döndürmedi.");
        }
        revisionId = saved.data.id;
        setBaseVersion(saved.data.version);
      }
      const { latest } = await readHomePage(id, target);
      if (!latest || (revisionId && latest.id !== revisionId) || !sameEditorDraft(readHomeEditor(latest.document), readHomeEditor(document))) {
        throw new UnverifiedSave("Kaydedilen taslak sunucuda okunamadı.");
      }
      setBaseVersion(latest.version);
      setSavedSignature(mark);
      setBanner({ tone: "ok", text: `Taslak kaydedildi (sürüm ${latest.version}). Yayında değil.` });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setPageId(null);
        setBaseVersion(0);
      }
      setBanner({ tone: "error", text: saveErrorText(error) });
    } finally {
      setSaving(false);
    }
  }

  // Tablet and phone text never goes below the readable minimum.
  function readable<T extends { fontSize?: number }>(partial: T): T {
    if (device === "desktop" || partial.fontSize == null || partial.fontSize >= MIN_DEVICE_FONT) return partial;
    return { ...partial, fontSize: MIN_DEVICE_FONT };
  }

  function updateCopy(partial: Partial<EditorCopyPatch>) {
    if (!selected || !isEditableCopy(selected)) return;
    const id = selected;
    setCopies((current) => ({ ...current, [id]: writeForDevice<CopyValues>(current[id], readable(partial), device, COPY_DEVICE_KEYS) }));
  }

  function updateImage(partial: Partial<EditorImagePatch>) {
    if (!selected || !imageKind(selected)) return;
    const id = selected;
    setImages((current) => ({ ...current, [id]: writeForDevice<EditorImageStyle>(current[id], partial, device, IMAGE_DEVICE_KEYS) }));
  }

  function clearImage(key: keyof EditorImagePatch) {
    if (!selected) return;
    const id = selected;
    setImages((current) => ({ ...current, [id]: clearForDevice<EditorImageStyle>(current[id], key as keyof EditorImageStyle, device, IMAGE_DEVICE_KEYS) }));
  }

  function resetImage() {
    if (!selected) return;
    const id = selected;
    setImages((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function onFocusStart(event: React.PointerEvent, id: string, image: HTMLImageElement) {
    if (event.button !== 0) return;
    trackPointer(event, (move) => {
      const rect = image.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const focusX = clampImageNumber("focusX", ((move.clientX - rect.left) / rect.width) * 100);
      const focusY = clampImageNumber("focusY", ((move.clientY - rect.top) / rect.height) * 100);
      setImages((current) => ({ ...current, [id]: { ...current[id], focusX, focusY } }));
    });
  }

  function updateBox(partial: Partial<EditorBoxStyle>) {
    if (!selected || !boxKind(selected)) return;
    const id = selected;
    setBoxes((current) => ({ ...current, [id]: writeForDevice<EditorBoxValues>(current[id], partial, device, BOX_DEVICE_KEYS) }));
  }

  function clearBox(key: keyof EditorBoxStyle) {
    if (!selected) return;
    const id = selected;
    setBoxes((current) => ({ ...current, [id]: clearForDevice<EditorBoxValues>(current[id], key as keyof EditorBoxValues, device, BOX_DEVICE_KEYS) }));
  }

  function resetBox() {
    if (!selected) return;
    const id = selected;
    setBoxes((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function onBoxResizeStart(event: React.PointerEvent, id: string) {
    if (event.button !== 0) return;
    const element = elementById(stageRef.current, id);
    if (!element) return;
    const start = element.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    trackPointer(event, (move) => {
      const width = clampBoxNumber("width", start.width + move.clientX - startX);
      const minHeight = clampBoxNumber("minHeight", start.height + move.clientY - startY);
      setBoxes((current) => ({ ...current, [id]: writeForDevice<EditorBoxValues>(current[id], { width, minHeight }, device, BOX_DEVICE_KEYS) }));
    });
  }

  function updateLink(partial: Partial<EditorLinkPatch>) {
    if (!selected || !linkKind(selected)) return;
    const id = selected;
    setLinks((current) => ({ ...current, [id]: writeForDevice<LinkValues>(current[id], readable(partial), device, LINK_DEVICE_KEYS) }));
  }

  function clearLink(key: keyof EditorLinkPatch) {
    if (!selected) return;
    const id = selected;
    setLinks((current) => ({ ...current, [id]: clearForDevice<LinkValues>(current[id], key as keyof LinkValues, device, LINK_DEVICE_KEYS) }));
  }

  function resetLink() {
    if (!selected) return;
    const id = selected;
    setLinks((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  // Clears the selected element's settings for the current screen only; other screens keep theirs.
  function resetDeviceSettings() {
    if (!selected) return;
    const id = selected;
    markStep();
    if (copies[id]) setCopies((current) => ({ ...current, [id]: resetForDevice<CopyValues>(current[id], device, COPY_DEVICE_KEYS) }));
    if (links[id]) setLinks((current) => ({ ...current, [id]: resetForDevice<LinkValues>(current[id], device, LINK_DEVICE_KEYS) }));
    if (images[id]) setImages((current) => ({ ...current, [id]: resetForDevice<EditorImageStyle>(current[id], device, IMAGE_DEVICE_KEYS) }));
    if (boxes[id]) setBoxes((current) => ({ ...current, [id]: resetForDevice<EditorBoxValues>(current[id], device, BOX_DEVICE_KEYS) }));
  }

  function resetCopy() {
    if (!selected) return;
    const id = selected;
    setCopies((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function clearCopy(key: keyof EditorCopyPatch) {
    if (!selected) return;
    const id = selected;
    setCopies((current) => ({ ...current, [id]: clearForDevice<CopyValues>(current[id], key as keyof CopyValues, device, COPY_DEVICE_KEYS) }));
  }

  const copyElement = selected && isEditableCopy(selected) ? elementById(stage, selected) : null;
  const copyPatch = selected && copies[selected] ? resolveForDevice<CopyValues>(copies[selected], device, COPY_DEVICE_KEYS) : undefined;
  const ownDeviceValues =
    !!selected &&
    (hasDeviceValues<CopyValues>(copies[selected], device, COPY_DEVICE_KEYS) ||
      hasDeviceValues<LinkValues>(links[selected], device, LINK_DEVICE_KEYS) ||
      hasDeviceValues<EditorImageStyle>(images[selected], device, IMAGE_DEVICE_KEYS) ||
      hasDeviceValues<EditorBoxValues>(boxes[selected], device, BOX_DEVICE_KEYS));
  const selectedImageKind = selected ? imageKind(selected) : null;
  const imageElement = selected && selectedImageKind ? elementById(stage, selected) : null;
  const focusImage = imageElement && selectedImageKind !== "mark" ? imageTarget(imageElement) : null;
  let focusPoint: { top: number; left: number } | null = null;
  if (focusImage && box && selected) {
    const rect = focusImage.getBoundingClientRect();
    const current = readFocus(focusImage);
    const x = images[selected]?.focusX ?? current.x;
    const y = images[selected]?.focusY ?? current.y;
    const left = rect.left + (rect.width * x) / 100;
    const top = rect.top + (rect.height * y) / 100;
    if (left >= box.left && left <= box.left + box.width && top >= box.top && top <= box.top + box.height) focusPoint = { top, left };
  }
  const selectedLinkKind = selected ? linkKind(selected) : null;
  const linkElement = selected && selectedLinkKind ? elementById(stage, selected) : null;
  const selectedBoxKind = selected ? boxKind(selected) : null;
  const boxElement = selected && selectedBoxKind ? elementById(stage, selected) : null;
  const boxItems: BoxChild[] = [];
  if (boxElement && selected) {
    for (const child of boxElement.querySelectorAll<HTMLElement>("[data-editor-id]")) {
      const id = child.getAttribute("data-editor-id");
      const node = id ? describeEditorNode(id) : null;
      if (!id || !node || node.parent !== selected || !isVisible(child)) continue;
      const product = isProductCardBox(id) ? child.querySelector("h3")?.textContent?.trim() : "";
      const name = product ? `${node.name} · ${product}` : node.name;
      boxItems.push({ id, name: node.locked ? `${name} (kilitli)` : name });
    }
  }

  const nodeName = (node: EditorNode) =>
    node.type === "text" || node.type === "button" ? `${NODE_LABELS[node.type]} · ${node.text.replace(/\s+/g, " ").trim().slice(0, 24) || "boş"}` : NODE_LABELS[node.type];
  const info = selectedNode
    ? { name: NODE_LABELS[selectedNode.type], parent: parentEditorId(selectedNode), locked: false }
    : selected
      ? describeEditorNode(selected)
      : null;
  const parentNode = info?.parent ? findNode(nodes, info.parent) : null;
  const parent = parentNode ? { name: nodeName(parentNode) } : info?.parent ? describeEditorNode(info.parent) : null;
  const nodeEditing = selectedNode ? editBounds(selectedNode, nodes) : null;
  const deviceLabel = PREVIEW_DEVICES.find((item) => item.id === device)?.label ?? "Masaüstü";
  const freeItems = (parentId: string): BoxChild[] =>
    childrenOf(nodes, parentId).map((node) => ({ id: nodeEditorId(node.id), name: nodeName(node) }));
  if (boxElement && selected) boxItems.push(...freeItems(selected));

  return (
    <div className="visual-editor">
      <header className="visual-editor-bar">
        <strong>Ana sayfa</strong>
        <span className="visual-editor-temporary">{target === HOME_EDITOR_SLUG ? "Yayında değil" : "Deneme taslağı · yayında değil"}</span>
        <span
          className={status.tone === "error" ? "visual-editor-status is-error" : status.tone === "ok" ? "visual-editor-status is-ok" : "visual-editor-status"}
          role="status"
        >
          {saving ? "Kaydediliyor…" : status.text}
        </span>
        <div className="visual-editor-devices" role="group" aria-label="Önizleme cihazı">
          {PREVIEW_DEVICES.map((item) => (
            <button
              type="button"
              key={item.id}
              className={device === item.id ? "is-active" : undefined}
              aria-pressed={device === item.id}
              title={item.width ? `${item.label} · ${item.width} px` : `${item.label} · en az ${DESKTOP_MIN_WIDTH} px`}
              onClick={() => {
                setAddOpen(false);
                setDevice(item.id);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="visual-editor-history">
          <button type="button" onClick={undo} disabled={!ready || historySize.undo === 0} title="Geri al (Ctrl+Z)">
            Geri al
          </button>
          <button type="button" onClick={redo} disabled={!ready || historySize.redo === 0} title="Yinele (Ctrl+Y)">
            Yinele
          </button>
        </div>
        <button
          type="button"
          className={dirty ? "visual-editor-save is-dirty" : "visual-editor-save"}
          onClick={saveDraft}
          disabled={!ready || saving || !dirty}
          title={dirty ? "Değişiklikleri taslağa kaydet" : "Kaydedilecek değişiklik yok"}
        >
          {saving ? "Kaydediliyor…" : "Taslak Kaydet"}
        </button>
        <Link
          href="/admin/page-builder"
          onClick={(event) => {
            if (!dirty) return;
            if (!window.confirm("Kaydedilmemiş değişiklikler var. Yine de ayrılmak istiyor musunuz?")) event.preventDefault();
          }}
        >
          Page Builder
        </Link>
      </header>
      <div
        className={ready ? "visual-editor-stage" : "visual-editor-stage is-locked"}
        ref={attachStage}
        onClickCapture={onClickCapture}
        onAuxClickCapture={onClickCapture}
        onSubmitCapture={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onKeyDownCapture={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          const target = event.target as HTMLElement;
          if (!target.closest("a, button")) return;
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <div className="visual-editor-page" data-device={device}>
          {children}
        </div>
        {ready
          ? nodes
              .filter((node) => !isNodeId(node.parentId))
              .map((node) => {
                const host = elementById(stage, node.parentId);
                const size = host ? hostSize(node) : null;
                if (!host || !size) return null;
                const frame = nodeFrame(node, device);
                const scale = nodeScale(node, size, device);
                return createPortal(
                  <div
                    className="editor-node-frame"
                    style={{ width: frame.width, height: frame.height, zIndex: 3 + node.order, transform: scale < 1 ? `scale(${scale})` : undefined }}
                  >
                    <NodeView node={node} nodes={nodes} device={device} scale={scale} onPointerDown={onNodePointerDown} />
                  </div>,
                  host,
                  node.id,
                );
              })
          : null}
      </div>
      <aside className="visual-editor-panel" aria-label="Seçilen öğe">
        {selectedNode ? null : (
          <div className="visual-editor-device-note" data-device={device}>
            <p>
              <strong>{deviceLabel}</strong> tasarımı düzenleniyor.{" "}
              {desktop
                ? "Masaüstü varsayılan tasarımdır; tablet ve telefon, kendilerine değer girilmedikçe mağazanın uyumlu düzenini kullanır."
                : `Yazı ölçüleri, genişlik, yükseklik ve boşluklar yalnızca ${deviceLabel.toLocaleLowerCase("tr")} için kaydedilir; boş alanlarda mağazanın kendi düzeni kullanılır. Metin, renk, adres ve görsel tüm cihazlarda ortaktır.`}
            </p>
            {selected ? (
              <>
                <p>{ownDeviceValues ? `Bu öğenin ${deviceLabel.toLocaleLowerCase("tr")} için ayrı ayarları var.` : `Bu öğenin ${deviceLabel.toLocaleLowerCase("tr")} için ayrı ayarı yok.`}</p>
                <button type="button" className="visual-editor-reset" onClick={resetDeviceSettings} disabled={!ownDeviceValues}>
                  Yalnızca {deviceLabel.toLocaleLowerCase("tr")} ayarlarını sıfırla
                </button>
              </>
            ) : null}
          </div>
        )}
        {selectedNode && nodeEditing ? (
          <>
            <p className="visual-editor-kicker">{parent ? `Serbest öğe · ${parent.name}` : "Serbest öğe"}</p>
            <h2>{info?.name}</h2>
            <p className="visual-editor-note">Üstteki Taslak Kaydet ile saklanır; yayındaki mağazada görünmez.</p>
            <NodeSettings
              key={selected}
              node={nodePanelView(selectedNode)}
              bounds={nodeEditing.bounds}
              device={device}
              deviceLabel={deviceLabel}
              items={freeItems(selectedNode.id)}
              canAdd={desktop && canHoldNodes(nodes, selected)}
              onSelect={choose}
              onBox={(next) => writeNodeBox(selectedNode.id, next)}
              onContent={(patch) => updateNode(selectedNode.id, (node) => ({ ...node, ...patch }) as EditorNode)}
              onStyle={(partial) => updateNodeStyle(selectedNode.id, partial)}
              onClearStyle={(key) => clearNodeStyle(selectedNode.id, key)}
              onOrder={(move) => orderSelected(selectedNode, move)}
              onDuplicate={() => duplicateSelected(selectedNode)}
              onDelete={() => deleteSelected(selectedNode)}
              onResetDevice={() => resetDeviceLayout(selectedNode.id)}
            />
            <div className="visual-editor-parent">
              <p className="visual-editor-note">Üst öğe</p>
              {parent ? (
                <button type="button" onClick={selectParent}>
                  {parent.name}
                </button>
              ) : (
                <p className="visual-editor-note">Yok</p>
              )}
              {parentNote ? <p className="visual-editor-note">{parentNote}</p> : null}
            </div>
          </>
        ) : selected && info && copyElement ? (
          <>
            <p className="visual-editor-kicker">{parent ? `Metin · ${parent.name}` : "Metin"}</p>
            <h2>{info.name}</h2>
            <p className="visual-editor-note">Üstteki Taslak Kaydet ile saklanır.</p>
            <TextSettings
              key={selected}
              element={copyElement}
              patch={copyPatch}
              onChange={updateCopy}
              onClear={clearCopy}
              onReset={resetCopy}
            />
            <div className="visual-editor-parent">
              <p className="visual-editor-note">Üst öğe</p>
              {parent ? (
                <button type="button" onClick={selectParent}>
                  {parent.name}
                </button>
              ) : (
                <p className="visual-editor-note">Yok</p>
              )}
              {parentNote ? <p className="visual-editor-note">{parentNote}</p> : null}
            </div>
          </>
        ) : selected && info && selectedImageKind && imageElement && !info.locked ? (
          <>
            <p className="visual-editor-kicker">Görsel</p>
            <h2>{info.name}</h2>
            <p className="visual-editor-note">Üstteki Taslak Kaydet ile saklanır.</p>
            <ImageSettings
              key={selected}
              element={imageElement}
              kind={selectedImageKind}
              patch={images[selected] && resolveForDevice<EditorImageStyle>(images[selected], device, IMAGE_DEVICE_KEYS)}
              onChange={updateImage}
              onClear={clearImage}
              onReset={resetImage}
            />
            <div className="visual-editor-parent">
              <p className="visual-editor-note">Üst öğe</p>
              {parent ? (
                <button type="button" onClick={selectParent}>
                  {parent.name}
                </button>
              ) : (
                <p className="visual-editor-note">Yok</p>
              )}
              {parentNote ? <p className="visual-editor-note">{parentNote}</p> : null}
            </div>
          </>
        ) : selected && info && selectedBoxKind && boxElement && !info.locked ? (
          <>
            <p className="visual-editor-kicker">{selectedBoxKind === "section" ? "Bölüm" : selectedBoxKind === "container" ? "Konteyner" : "Kart"}</p>
            <h2>{info.name}</h2>
            <p className="visual-editor-note">Üstteki Taslak Kaydet ile saklanır.</p>
            <BoxSettings
              key={selected}
              element={boxElement}
              kind={selectedBoxKind}
              patch={boxes[selected] && resolveForDevice<EditorBoxValues>(boxes[selected], device, BOX_DEVICE_KEYS)}
              href={selectedLinkKind === "card" ? (links[selected]?.href ?? boxElement.getAttribute("href") ?? "") : null}
              productCard={isProductCardBox(selected)}
              items={boxItems}
              onSelect={choose}
              onHref={(href) => updateLink({ href })}
              onChange={updateBox}
              onClear={clearBox}
              onReset={() => {
                resetBox();
                if (selectedLinkKind === "card") resetLink();
              }}
            />
            <div className="visual-editor-parent">
              <p className="visual-editor-note">Üst öğe</p>
              {parent ? (
                <button type="button" onClick={selectParent}>
                  {parent.name}
                </button>
              ) : (
                <p className="visual-editor-note">Yok</p>
              )}
              {parentNote ? <p className="visual-editor-note">{parentNote}</p> : null}
            </div>
          </>
        ) : selected && info && selectedLinkKind && linkElement && !info.locked ? (
          <>
            <p className="visual-editor-kicker">{selectedLinkKind === "button" ? "Buton" : selectedLinkKind === "card" ? "Kart bağlantısı" : "Bağlantı"}</p>
            <h2>{info.name}</h2>
            <p className="visual-editor-note">Üstteki Taslak Kaydet ile saklanır. Editörde bağlantılar açılmaz.</p>
            <LinkSettings
              key={selected}
              element={linkElement}
              kind={selectedLinkKind}
              patch={links[selected] && resolveForDevice<LinkValues>(links[selected], device, LINK_DEVICE_KEYS)}
              onChange={updateLink}
              onClear={clearLink}
              onReset={resetLink}
            />
            <div className="visual-editor-parent">
              <p className="visual-editor-note">Üst öğe</p>
              {parent ? (
                <button type="button" onClick={selectParent}>
                  {parent.name}
                </button>
              ) : (
                <p className="visual-editor-note">Yok</p>
              )}
              {parentNote ? <p className="visual-editor-note">{parentNote}</p> : null}
            </div>
          </>
        ) : selected && info ? (
          <>
            <p className="visual-editor-kicker">{info.locked ? "Ticari veri" : "Düzenlenebilir"}</p>
            <h2>{info.name}</h2>
            {preview ? <p className="visual-editor-note">{preview}</p> : null}
            <div className="visual-editor-parent">
              <p className="visual-editor-note">Üst öğe</p>
              {parent ? (
                <button type="button" onClick={selectParent}>
                  {parent.name}
                </button>
              ) : (
                <p className="visual-editor-note">Yok</p>
              )}
              {parentNote ? <p className="visual-editor-note">{parentNote}</p> : null}
            </div>
          </>
        ) : selected ? (
          <p className="visual-editor-note">Bu öğe tanımlı değil.</p>
        ) : (
          <p className="visual-editor-note">Sayfadan bir öğe seçin.</p>
        )}
      </aside>
      {box ? (
        <div className="visual-editor-frame" style={{ top: box.top, left: box.left, width: box.width, height: box.height }}>
          {selectedNode
            ? HANDLES.map((handle) => (
                <button
                  key={handle}
                  type="button"
                  className={`visual-editor-handle is-${handle}`}
                  aria-label={`Boyutlandır (${handle})`}
                  onPointerDown={(event) => onNodeResizeStart(event, selectedNode, handle)}
                />
              ))
            : null}
          {boxElement && selected && !info?.locked ? (
            <button
              type="button"
              className="visual-editor-handle is-se"
              aria-label="Kutuyu boyutlandır"
              title="Genişlik ve minimum yükseklik için sürükleyin"
              onPointerDown={(event) => onBoxResizeStart(event, selected)}
            />
          ) : null}
          {copyElement && selected ? (
            <button
              type="button"
              className="visual-editor-width-handle"
              aria-label="Genişliği değiştir"
              title="Genişliği değiştirmek için sürükleyin"
              onPointerDown={(event) => onCopyWidthStart(event, selected)}
            />
          ) : null}
        </div>
      ) : null}
      {focusPoint && focusImage && selected ? (
        <button
          type="button"
          className="visual-editor-focus"
          style={{ top: focusPoint.top, left: focusPoint.left }}
          aria-label="Odak noktası"
          title="Odağı değiştirmek için sürükleyin"
          onPointerDown={(event) => onFocusStart(event, selected, focusImage)}
        />
      ) : null}
      {cardBox ? (
        <div className="visual-editor-add" style={{ top: cardBox.top, left: cardBox.left }} data-editor-ui="add">
          <button type="button" data-editor-ui="add" onClick={() => setAddOpen((open) => !open)}>
            + Ekle
          </button>
          {addOpen ? (
            <>
              {ADD_TYPES.map((type) => (
                <button key={type} type="button" data-editor-ui="add" onClick={() => addNode(type)}>
                  {NODE_LABELS[type]}
                </button>
              ))}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
