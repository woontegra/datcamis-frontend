"use client";

import { useLayoutEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { applyBoxStyle, boxKind, shadowCss } from "@/lib/editor-boxes";
import { MIN_DEVICE_FONT } from "@/lib/editor-devices";
import { applyCopyPatch, COPY_FONTS, type EditorDraft } from "@/lib/editor-elements";
import { applyImagePatch, imageKind, mediaUrl } from "@/lib/editor-images";
import { NodeIconSvg } from "@/lib/editor-icons";
import { applyLinkPatch, linkKind } from "@/lib/editor-links";
import {
  childrenOf,
  isNodeId,
  nodeBox,
  nodeEditorId,
  nodeForDevice,
  nodeFrame,
  nodeScale,
  type EditorNode,
  type NodeSize,
} from "@/lib/editor-nodes";
import { DESKTOP_MIN_WIDTH, type PreviewDevice } from "@/lib/editor-preview";

const NODE_DEFAULT_FONT = { text: 16.8, button: 15.2 };

function currentDevice(): PreviewDevice {
  if (typeof window === "undefined") return "desktop";
  if (window.innerWidth >= DESKTOP_MIN_WIDTH) return "desktop";
  return window.innerWidth >= 700 ? "tablet" : "mobile";
}

function elementById(root: HTMLElement, id: string) {
  return root.querySelector<HTMLElement>(`[data-editor-id="${CSS.escape(id)}"]`);
}

function readableFont(size: number | undefined, kind: "text" | "button", device: PreviewDevice, scale: number) {
  const base = size ?? NODE_DEFAULT_FONT[kind];
  if (device === "desktop" || base * scale >= MIN_DEVICE_FONT) return size;
  return Math.ceil((MIN_DEVICE_FONT / scale) * 10) / 10;
}

function nodeStyle(source: EditorNode, device: PreviewDevice, scale: number): CSSProperties {
  const node = nodeForDevice(source, device);
  const box = nodeBox(node, device);
  const style: CSSProperties = { left: box.x, top: box.y, width: box.width, height: box.height, zIndex: node.order + 1 };
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

function NodeBody({ node, nodes, device, scale }: { node: EditorNode; nodes: EditorNode[]; device: PreviewDevice; scale: number }) {
  switch (node.type) {
    case "text":
      return <>{node.text}</>;
    case "button":
      return node.href ? <a className="editor-node-label" href={node.href}>{node.text}</a> : <span className="editor-node-label">{node.text}</span>;
    case "icon":
      return <NodeIconSvg icon={node.icon} />;
    case "image": {
      if (!node.mediaId) return null;
      const css = node.style ?? {};
      return (
        <img
          src={mediaUrl(node.mediaId)}
          alt={node.alt ?? ""}
          style={{ objectFit: css.fit ?? "cover", objectPosition: `${css.focusX ?? 50}% ${css.focusY ?? 50}%` }}
        />
      );
    }
    default:
      return <>{childrenOf(nodes, node.id).map((child) => <LiveNode key={child.id} node={child} nodes={nodes} device={device} scale={scale} />)}</>;
  }
}

function LiveNode({ node, nodes, device, scale }: { node: EditorNode; nodes: EditorNode[]; device: PreviewDevice; scale: number }) {
  return (
    <div className={`editor-node is-${node.type}`} data-editor-id={nodeEditorId(node.id)} style={nodeStyle(node, device, scale)}>
      <NodeBody node={node} nodes={nodes} device={device} scale={scale} />
    </div>
  );
}

export function HomePublished({ root, draft }: { root: HTMLElement; draft: EditorDraft }) {
  const [device, setDevice] = useState<PreviewDevice>(currentDevice);
  const [tick, setTick] = useState(0);
  const { copies, links, images, boxes, nodes } = draft;

  useLayoutEffect(() => {
    const onResize = () => {
      setDevice(currentDevice());
      setTick((value) => value + 1);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useLayoutEffect(() => {
    for (const [id, patch] of Object.entries(copies)) {
      const element = elementById(root, id);
      if (element) applyCopyPatch(element, patch, device);
    }
    for (const [id, patch] of Object.entries(links)) {
      const kind = linkKind(id);
      const element = elementById(root, id);
      if (kind && element) applyLinkPatch(element, patch, kind, device);
    }
    for (const [id, patch] of Object.entries(images)) {
      const kind = imageKind(id);
      const element = elementById(root, id);
      if (kind && element) applyImagePatch(element, patch, kind, device);
    }
    for (const [id, patch] of Object.entries(boxes)) {
      const element = boxKind(id) ? elementById(root, id) : null;
      if (element) applyBoxStyle(element, patch, device);
    }
  }, [root, copies, links, images, boxes, device, tick]);

  const frames = useMemo(() => {
    void tick;
    return nodes
      .filter((node) => !isNodeId(node.parentId))
      .map((node) => {
        const host = elementById(root, node.parentId);
        if (!host || host.clientWidth <= 0 || host.clientHeight <= 0) return null;
        const size: NodeSize = { width: host.clientWidth, height: host.clientHeight };
        const frame = nodeFrame(node, device);
        const scale = nodeScale(node, size, device);
        return { node, host, frame, scale };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [nodes, root, device, tick]);

  return (
    <>
      {frames.map(({ node, host, frame, scale }) =>
        createPortal(
          <div
            className="editor-node-frame"
            style={{ width: frame.width, height: frame.height, zIndex: 3 + node.order, transform: scale < 1 ? `scale(${scale})` : undefined }}
          >
            <LiveNode node={node} nodes={nodes} device={device} scale={scale} />
          </div>,
          host,
          node.id,
        ),
      )}
    </>
  );
}
