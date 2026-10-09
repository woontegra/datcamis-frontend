"use client";

import { useEffect, useRef, useState } from "react";
import {
  clampCopyWidth,
  clampFontSize,
  clampLetterSpacing,
  clampLineHeight,
  clampSpace,
  copyWidthFromPx,
  COPY_FONTS,
  COPY_WEIGHTS,
  parseDecimal,
  parsePx,
  readElementCopy,
  toHexColor,
  type CopyAlign,
  type CopyFont,
  type CopyWeight,
  type CopyWidth,
  type EditorCopyPatch,
} from "@/lib/editor-elements";
import { checkHref, clampLinkNumber, readLinkText, type EditorLinkPatch, type LinkKind } from "@/lib/editor-links";
import {
  BOX_SIDES,
  clampBoxNumber,
  clampShadowNumber,
  DEFAULT_SHADOW,
  type BoxKind,
  type EditorBoxStyle,
} from "@/lib/editor-boxes";
import { browserApi } from "@/lib/api";
import { MediaUploader } from "@/components/admin/MediaUploader";
import type { UploadInfo } from "@/lib/media-upload";
import {
  clampImageNumber,
  IMAGE_MIME_TYPES,
  imageTarget,
  isMediaId,
  mediaUrl,
  readFocus,
  type EditorImagePatch,
  type ImageFit,
  type ImageKind,
  type MediaItem,
} from "@/lib/editor-images";
import { hasLayout, nodeBox } from "@/lib/editor-nodes";
import type { EditorNode, NodeBox, NodeButtonStyle, NodeContainerStyle, NodeDevice, NodeIconStyle, NodeImageStyle, NodeOrderMove, NodeSize, NodeTextStyle } from "@/lib/editor-nodes";
import { NODE_ICON_NAMES, NODE_ICONS, NodeIconSvg, type NodeIcon } from "@/lib/editor-icons";

export function PanelSection({ title, open = false, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details className="visual-editor-section" open={open}>
      <summary>{title}</summary>
      <div className="visual-editor-section-body">{children}</div>
    </details>
  );
}

export function OptionalNumberField({
  label,
  value,
  placeholder,
  unit = "px",
  decimal = false,
  ariaLabel,
  onChange,
}: {
  label: string;
  ariaLabel?: string;
  value: number | null;
  placeholder: string;
  unit?: string;
  decimal?: boolean;
  onChange: (next: number | null) => void;
}) {
  const [text, setText] = useState(value == null ? "" : String(value));
  const focused = useRef(false);
  const parse = decimal ? parseDecimal : parsePx;

  useEffect(() => {
    if (!focused.current) setText(value == null ? "" : String(value));
  }, [value]);

  return (
    <label className="visual-editor-field">
      {label}
      <span>
        <input
          value={text}
          inputMode={decimal ? "decimal" : "numeric"}
          aria-label={ariaLabel ?? label}
          placeholder={placeholder}
          onFocus={() => {
            focused.current = true;
          }}
          onBlur={() => {
            focused.current = false;
            if (text.trim() === "") {
              setText("");
              onChange(null);
              return;
            }
            const parsed = parse(text);
            if (parsed === null) setText(value == null ? "" : String(value));
            else onChange(parsed);
          }}
          onChange={(event) => {
            const next = event.target.value;
            setText(next);
            if (next.trim() === "") {
              onChange(null);
              return;
            }
            const parsed = parse(next);
            if (parsed !== null) onChange(parsed);
          }}
        />
        {unit ? <small>{unit}</small> : null}
      </span>
    </label>
  );
}

function round(value: number, digits: number) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

export function TextSettings({
  element,
  patch,
  onChange,
  onClear,
  onReset,
}: {
  element: HTMLElement;
  patch: EditorCopyPatch | undefined;
  onChange: (partial: Partial<EditorCopyPatch>) => void;
  onClear: (key: keyof EditorCopyPatch) => void;
  onReset: () => void;
}) {
  const computed = getComputedStyle(element);
  const fontPx = Number.parseFloat(computed.fontSize);
  const lineRatio = computed.lineHeight === "normal" ? null : round(Number.parseFloat(computed.lineHeight) / fontPx, 2);
  const spacingPx = computed.letterSpacing === "normal" ? 0 : round(Number.parseFloat(computed.letterSpacing), 1);
  const widthUnit = patch?.width?.unit ?? "px";
  const text = patch?.text ?? readElementCopy(element);

  return (
    <>
      <PanelSection title="İçerik" open>
        <label className="visual-editor-field">
          Metin
          <textarea value={text} aria-label="Metin" rows={4} onChange={(event) => onChange({ text: event.target.value })} />
        </label>
        <p className="visual-editor-note">Satır sonları korunur. Uzun satır sığmazsa Gelişmiş’ten genişliği artırın.</p>
      </PanelSection>

      <PanelSection title="Tasarım" open>
        <label className="visual-editor-field">
          Yazı tipi
          <select
            aria-label="Yazı tipi"
            value={patch?.fontFamily ?? ""}
            onChange={(event) => (event.target.value ? onChange({ fontFamily: event.target.value as CopyFont }) : onClear("fontFamily"))}
          >
            <option value="">Varsayılan</option>
            {(Object.keys(COPY_FONTS) as CopyFont[]).map((font) => (
              <option key={font} value={font}>
                {COPY_FONTS[font].label}
              </option>
            ))}
          </select>
        </label>
        <label className="visual-editor-field">
          Kalınlık
          <select
            aria-label="Kalınlık"
            value={patch?.fontWeight ?? ""}
            onChange={(event) => (event.target.value ? onChange({ fontWeight: Number(event.target.value) as CopyWeight }) : onClear("fontWeight"))}
          >
            <option value="">Varsayılan</option>
            {COPY_WEIGHTS.map((weight) => (
              <option key={weight.value} value={weight.value}>
                {weight.label}
              </option>
            ))}
          </select>
        </label>
        <OptionalNumberField
          label="Yazı boyutu"
          value={patch?.fontSize ?? null}
          placeholder={String(Math.round(fontPx))}
          onChange={(fontSize) => (fontSize == null ? onClear("fontSize") : onChange({ fontSize: clampFontSize(fontSize) }))}
        />
        <label className="visual-editor-field">
          Renk
          <span>
            <input type="color" aria-label="Renk" value={patch?.color ?? toHexColor(computed.color)} onChange={(event) => onChange({ color: event.target.value })} />
          </span>
        </label>
        <div className="visual-editor-field">
          Hizalama
          <div className="visual-editor-choice">
            {(["left", "center", "right"] as CopyAlign[]).map((align) => (
              <button key={align} type="button" aria-pressed={patch?.align === align} onClick={() => onChange({ align })}>
                {align === "left" ? "Sol" : align === "center" ? "Orta" : "Sağ"}
              </button>
            ))}
          </div>
        </div>
        <OptionalNumberField
          label="Satır aralığı"
          unit="×"
          decimal
          value={patch?.lineHeight ?? null}
          placeholder={lineRatio == null ? "" : String(lineRatio)}
          onChange={(lineHeight) => (lineHeight == null ? onClear("lineHeight") : onChange({ lineHeight: clampLineHeight(lineHeight) }))}
        />
        <OptionalNumberField
          label="Harf aralığı"
          decimal
          value={patch?.letterSpacing ?? null}
          placeholder={String(spacingPx)}
          onChange={(letterSpacing) => (letterSpacing == null ? onClear("letterSpacing") : onChange({ letterSpacing: clampLetterSpacing(letterSpacing) }))}
        />
      </PanelSection>

      <PanelSection title="Gelişmiş">
        <OptionalNumberField
          label="Genişlik"
          unit={widthUnit}
          value={patch?.width?.value ?? null}
          placeholder={widthUnit === "%" ? "100" : String(Math.round(element.getBoundingClientRect().width))}
          onChange={(value) => (value == null ? onClear("width") : onChange({ width: clampCopyWidth(value, widthUnit) }))}
        />
        <div className="visual-editor-choice">
          {(["px", "%"] as CopyWidth["unit"][]).map((unit) => (
            <button
              key={unit}
              type="button"
              aria-pressed={widthUnit === unit}
              onClick={() => {
                if (unit !== widthUnit) onChange({ width: copyWidthFromPx(element.getBoundingClientRect().width, unit, element) });
              }}
            >
              {unit === "px" ? "Piksel" : "Yüzde"}
            </button>
          ))}
        </div>
        <OptionalNumberField
          label="Üst boşluk"
          value={patch?.spaceTop ?? null}
          placeholder="0"
          onChange={(spaceTop) => (spaceTop == null ? onClear("spaceTop") : onChange({ spaceTop: clampSpace(spaceTop) }))}
        />
        <OptionalNumberField
          label="Alt boşluk"
          value={patch?.spaceBottom ?? null}
          placeholder="0"
          onChange={(spaceBottom) => (spaceBottom == null ? onClear("spaceBottom") : onChange({ spaceBottom: clampSpace(spaceBottom) }))}
        />
        <button type="button" className="visual-editor-reset" onClick={onReset} disabled={!patch || Object.keys(patch).length === 0}>
          Varsayılana dön
        </button>
      </PanelSection>
    </>
  );
}

type MediaLibrary = { items: MediaItem[]; upload?: UploadInfo };

let mediaCache: Promise<MediaLibrary> | null = null;

function loadMedia() {
  mediaCache ??= browserApi<{ data: MediaItem[]; meta?: { upload?: UploadInfo } }>("/admin/media")
    .then((body) => ({
      items: body.data.filter((item) => isMediaId(item.id) && IMAGE_MIME_TYPES.includes(item.mimeType)),
      upload: body.meta?.upload,
    }))
    .catch((error) => {
      mediaCache = null;
      throw error;
    });
  return mediaCache;
}

function MediaPicker({ selected, onPick }: { selected: string | undefined; onPick: (id: string) => void }) {
  const [library, setLibrary] = useState<MediaLibrary | null>(null);
  const [failed, setFailed] = useState(false);
  const [fresh, setFresh] = useState<string[]>([]);

  useEffect(() => {
    let cancel = false;
    loadMedia()
      .then((result) => {
        if (!cancel) setLibrary(result);
      })
      .catch(() => {
        if (!cancel) setFailed(true);
      });
    return () => {
      cancel = true;
    };
  }, []);

  function added(item: MediaItem) {
    if (!isMediaId(item.id) || !IMAGE_MIME_TYPES.includes(item.mimeType)) return;
    setLibrary((current) => {
      const next = { items: [item, ...(current?.items ?? []).filter((entry) => entry.id !== item.id)], upload: current?.upload };
      mediaCache = Promise.resolve(next);
      return next;
    });
    setFresh((ids) => [item.id, ...ids]);
  }

  const items = library?.items;
  return (
    <div className="visual-editor-library">
      <MediaUploader compact info={library?.upload} onUploaded={added} />
      {failed ? (
        <p className="visual-editor-note">Medya Kütüphanesi yüklenemedi.</p>
      ) : !items ? (
        <p className="visual-editor-note">Medya Kütüphanesi yükleniyor…</p>
      ) : items.length === 0 ? (
        <p className="visual-editor-note">Medya Kütüphanesinde görsel yok.</p>
      ) : (
        <div className="visual-editor-media" role="listbox" aria-label="Medya Kütüphanesi">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={selected === item.id}
              data-fresh={fresh.includes(item.id) || undefined}
              title={item.alt || item.filename}
              onClick={() => onPick(item.id)}
            >
              <img src={item.url} alt={item.alt || item.filename} />
              {fresh.includes(item.id) ? <span className="visual-editor-media-new">Yeni</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ImageSettings({
  element,
  kind,
  patch,
  onChange,
  onClear,
  onReset,
}: {
  element: HTMLElement;
  kind: ImageKind;
  patch: EditorImagePatch | undefined;
  onChange: (partial: Partial<EditorImagePatch>) => void;
  onClear: (key: keyof EditorImagePatch) => void;
  onReset: () => void;
}) {
  const [picking, setPicking] = useState(false);
  const image = imageTarget(element);
  if (!image) return <p className="visual-editor-note">Bu öğede görsel bulunamadı.</p>;
  const computed = getComputedStyle(image);
  const rect = image.getBoundingClientRect();
  const focus = readFocus(image);
  const fit: ImageFit = patch?.fit ?? (computed.objectFit === "contain" ? "contain" : "cover");
  const changed = !!patch && Object.keys(patch).length > 0;
  const reset = (
    <button type="button" className="visual-editor-reset" onClick={onReset} disabled={!changed}>
      Varsayılana dön
    </button>
  );
  const number = (key: Exclude<keyof EditorImagePatch, "tablet" | "mobile">, label: string, placeholder: number, unit = "px") => (
    <OptionalNumberField
      key={key}
      label={label}
      unit={unit}
      value={(patch?.[key] as number | undefined) ?? null}
      placeholder={String(Math.round(placeholder))}
      onChange={(value) => (value == null ? onClear(key) : onChange({ [key]: clampImageNumber(key, value) }))}
    />
  );

  return (
    <>
      <PanelSection title="İçerik" open>
        <div className="visual-editor-preview">
          <img src={image.currentSrc || image.src} alt="" />
        </div>
        <button type="button" className="visual-editor-pick" aria-expanded={picking} onClick={() => setPicking((open) => !open)}>
          {picking ? "Kütüphaneyi kapat" : "Medya Kütüphanesinden Değiştir"}
        </button>
        {picking ? (
          <MediaPicker
            selected={patch?.mediaId}
            onPick={(mediaId) => {
              onChange({ mediaId });
              setPicking(false);
            }}
          />
        ) : null}
        {kind === "mark" ? (
          <>
            <p className="visual-editor-note">Bu görselin yerleşimi korunur; yalnızca görsel değiştirilebilir.</p>
            {reset}
          </>
        ) : null}
      </PanelSection>

      {kind === "mark" ? null : (
        <>
          <PanelSection title="Tasarım" open>
            <div className="visual-editor-field">
              Sığdırma
              <div className="visual-editor-choice">
                {(["cover", "contain"] as ImageFit[]).map((value) => (
                  <button key={value} type="button" aria-pressed={fit === value} onClick={() => onChange({ fit: value })}>
                    {value === "cover" ? "Kapla" : "Sığdır"}
                  </button>
                ))}
              </div>
            </div>
            <OptionalNumberField
              label="Yatay odak"
              unit="%"
              value={patch?.focusX ?? null}
              placeholder={String(focus.x)}
              onChange={(value) => (value == null ? onClear("focusX") : onChange({ focusX: clampImageNumber("focusX", value), focusY: patch?.focusY ?? focus.y }))}
            />
            <OptionalNumberField
              label="Dikey odak"
              unit="%"
              value={patch?.focusY ?? null}
              placeholder={String(focus.y)}
              onChange={(value) => (value == null ? onClear("focusY") : onChange({ focusY: clampImageNumber("focusY", value), focusX: patch?.focusX ?? focus.x }))}
            />
            <p className="visual-editor-note">Odağı görselin üzerindeki noktayı sürükleyerek de değiştirebilirsiniz.</p>
            {kind === "photo" ? (
              <>
                {number("width", "Genişlik", rect.width)}
                {number("height", "Yükseklik", rect.height)}
                {number("radius", "Köşe yuvarlama", Number.parseFloat(computed.borderTopLeftRadius) || 0)}
                {number("borderWidth", "Kenarlık kalınlığı", Number.parseFloat(computed.borderTopWidth) || 0)}
                <ColorField label="Kenarlık rengi" value={patch?.borderColor ?? "#1e4a38"} onChange={(borderColor) => onChange({ borderColor })} />
              </>
            ) : (
              <p className="visual-editor-note">Kart oranını korumak için boyut değiştirilemez.</p>
            )}
            {reset}
          </PanelSection>
        </>
      )}
    </>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (next: string) => void }) {
  return (
    <label className="visual-editor-field">
      {label}
      <span>
        <input type="color" aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} />
      </span>
    </label>
  );
}

function HrefField({ value, onChange }: { value: string; onChange: (href: string) => void }) {
  const [text, setText] = useState(value);
  const [error, setError] = useState("");
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(value);
  }, [value]);

  return (
    <label className="visual-editor-field">
      Bağlantı adresi
      <input
        value={text}
        aria-label="Bağlantı adresi"
        aria-invalid={error ? true : undefined}
        spellCheck={false}
        onFocus={() => {
          focused.current = true;
        }}
        onBlur={() => {
          focused.current = false;
          if (error) {
            setText(value);
            setError("");
          }
        }}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          const checked = checkHref(next);
          if (checked.ok) {
            setError("");
            onChange(checked.href);
          } else {
            setError(checked.message);
          }
        }}
      />
      {error ? (
        <small className="visual-editor-error" role="alert">
          {error}
        </small>
      ) : (
        <small>Site içi yol / ile, dış adres https:// ile başlar.</small>
      )}
    </label>
  );
}

function backgroundHex(color: string) {
  const alpha = color.match(/rgba\([^)]*,\s*([\d.]+)\)/);
  if (alpha && Number(alpha[1]) === 0) return "#ffffff";
  return toHexColor(color);
}

export function LinkSettings({
  element,
  kind,
  patch,
  onChange,
  onClear,
  onReset,
}: {
  element: HTMLElement;
  kind: LinkKind;
  patch: EditorLinkPatch | undefined;
  onChange: (partial: Partial<EditorLinkPatch>) => void;
  onClear: (key: keyof EditorLinkPatch) => void;
  onReset: () => void;
}) {
  const computed = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  const href = patch?.href ?? element.getAttribute("href") ?? "";
  const changed = !!patch && Object.keys(patch).length > 0;
  const reset = (
    <button type="button" className="visual-editor-reset" onClick={onReset} disabled={!changed}>
      Varsayılana dön
    </button>
  );

  const number = (key: Exclude<keyof EditorLinkPatch, "tablet" | "mobile" | "text" | "href">, label: string, placeholder: number) => (
    <OptionalNumberField
      key={key}
      label={label}
      value={(patch?.[key] as number | undefined) ?? null}
      placeholder={String(Math.round(placeholder))}
      onChange={(value) => (value == null ? onClear(key) : onChange({ [key]: clampLinkNumber(key, value) }))}
    />
  );

  if (kind === "card") {
    return (
      <PanelSection title="İçerik" open>
        <HrefField value={href} onChange={(next) => onChange({ href: next })} />
        <p className="visual-editor-note">Kart yazılarını değiştirmek için kartın içindeki metinleri seçin.</p>
        {reset}
      </PanelSection>
    );
  }

  return (
    <>
      <PanelSection title="İçerik" open>
        <label className="visual-editor-field">
          {kind === "button" ? "Buton yazısı" : "Bağlantı yazısı"}
          <input
            value={patch?.text ?? readLinkText(element)}
            aria-label={kind === "button" ? "Buton yazısı" : "Bağlantı yazısı"}
            maxLength={120}
            onChange={(event) => onChange({ text: event.target.value })}
          />
        </label>
        <HrefField value={href} onChange={(next) => onChange({ href: next })} />
      </PanelSection>

      <PanelSection title="Tasarım" open>
        <ColorField label="Arka plan" value={patch?.background ?? backgroundHex(computed.backgroundColor)} onChange={(background) => onChange({ background })} />
        <ColorField label="Yazı rengi" value={patch?.color ?? toHexColor(computed.color)} onChange={(color) => onChange({ color })} />
        {number("fontSize", "Yazı boyutu", Number.parseFloat(computed.fontSize))}
        {number("width", "Genişlik", rect.width)}
        {number("height", "Yükseklik", rect.height)}
        {number("borderWidth", "Kenarlık kalınlığı", Number.parseFloat(computed.borderTopWidth) || 0)}
        <ColorField label="Kenarlık rengi" value={patch?.borderColor ?? toHexColor(computed.borderTopColor)} onChange={(borderColor) => onChange({ borderColor })} />
        {number("radius", "Köşe yuvarlama", Math.min(999, Number.parseFloat(computed.borderTopLeftRadius) || 0))}
        {number("paddingY", "İç boşluk (dikey)", Number.parseFloat(computed.paddingTop) || 0)}
        {number("paddingX", "İç boşluk (yatay)", Number.parseFloat(computed.paddingLeft) || 0)}
      </PanelSection>

      <PanelSection title="Gelişmiş">
        {number("marginTop", "Üst boşluk", Number.parseFloat(computed.marginTop) || 0)}
        {number("marginRight", "Sağ boşluk", Number.parseFloat(computed.marginRight) || 0)}
        {number("marginBottom", "Alt boşluk", Number.parseFloat(computed.marginBottom) || 0)}
        {number("marginLeft", "Sol boşluk", Number.parseFloat(computed.marginLeft) || 0)}
        {reset}
      </PanelSection>
    </>
  );
}

function OptionalColorField({
  label,
  value,
  fallback,
  onChange,
  onClear,
}: {
  label: string;
  value: string | undefined;
  fallback: string;
  onChange: (next: string) => void;
  onClear: () => void;
}) {
  return (
    <label className="visual-editor-field">
      {label}
      <span>
        <input type="color" aria-label={label} value={value ?? fallback} onChange={(event) => onChange(event.target.value)} />
        {value ? (
          <button type="button" className="visual-editor-clear" onClick={onClear}>
            Kaldır
          </button>
        ) : (
          <small>Varsayılan</small>
        )}
      </span>
    </label>
  );
}

export type BoxChild = { id: string; name: string };

export function BoxSettings({
  element,
  kind,
  patch,
  href,
  productCard,
  items,
  onSelect,
  onHref,
  onChange,
  onClear,
  onReset,
}: {
  element: HTMLElement;
  kind: BoxKind;
  patch: EditorBoxStyle | undefined;
  href: string | null;
  productCard: boolean;
  items: BoxChild[];
  onSelect: (id: string) => void;
  onHref: (href: string) => void;
  onChange: (partial: Partial<EditorBoxStyle>) => void;
  onClear: (key: keyof EditorBoxStyle) => void;
  onReset: () => void;
}) {
  const [picking, setPicking] = useState(false);
  const computed = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  const changed = !!patch && Object.keys(patch).length > 0;
  const hasPhoto = kind === "card" && !!element.querySelector(":scope > img");
  const shadow = patch?.shadow;

  const number = (key: Exclude<keyof EditorBoxStyle, "background" | "backgroundMediaId" | "borderColor" | "shadow" | "tablet" | "mobile">, label: string, placeholder: number, extra?: { unit?: string; aria?: string }) => (
    <OptionalNumberField
      key={key}
      label={label}
      ariaLabel={extra?.aria}
      unit={extra?.unit ?? "px"}
      value={(patch?.[key] as number | undefined) ?? null}
      placeholder={String(Math.round(placeholder))}
      onChange={(value) => (value == null ? onClear(key) : onChange({ [key]: clampBoxNumber(key, value) }))}
    />
  );

  const shadowNumber = (key: "x" | "y" | "blur" | "opacity", label: string, unit = "px") =>
    shadow ? (
      <OptionalNumberField
        key={key}
        label={label}
        ariaLabel={`Gölge ${label.toLocaleLowerCase("tr")}`}
        unit={unit}
        value={shadow[key]}
        placeholder={String(DEFAULT_SHADOW[key])}
        onChange={(value) => onChange({ shadow: { ...shadow, [key]: clampShadowNumber(key, value ?? DEFAULT_SHADOW[key]) } })}
      />
    ) : null;

  const sides = (prefix: "padding" | "margin", title: string) => (
    <div className="visual-editor-field">
      {title}
      <div className="visual-editor-sides">
        {BOX_SIDES.map(({ side, label }) =>
          number(`${prefix}${side}`, label, Number.parseFloat(computed[`${prefix}${side}`]) || 0, { aria: `${title} ${label.toLocaleLowerCase("tr")}` }),
        )}
      </div>
    </div>
  );

  return (
    <>
      <PanelSection title="İçerik" open>
        {href !== null ? <HrefField value={href} onChange={onHref} /> : null}
        {productCard ? <p className="visual-editor-note">Ürün adı, fiyat, stok ve sepet katalogdan gelir; burada yalnızca kartın görünümü değişir.</p> : null}
        {items.length > 0 ? (
          <div className="visual-editor-field">
            İçindekiler
            <div className="visual-editor-children">
              {items.map((item) => (
                <button key={item.id} type="button" onClick={() => onSelect(item.id)}>
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="visual-editor-note">İçindeki öğeleri sayfada tıklayarak seçin.</p>
        )}
      </PanelSection>

      <PanelSection title="Tasarım" open>
        <OptionalColorField
          label="Arka plan rengi"
          value={patch?.background}
          fallback={backgroundHex(computed.backgroundColor)}
          onChange={(background) => onChange({ background })}
          onClear={() => onClear("background")}
        />
        <div className="visual-editor-field">
          Arka plan görseli
          {patch?.backgroundMediaId ? (
            <div className="visual-editor-preview">
              <img src={mediaUrl(patch.backgroundMediaId)} alt="" />
            </div>
          ) : null}
          <div className="visual-editor-choice">
            <button type="button" aria-expanded={picking} onClick={() => setPicking((open) => !open)}>
              {picking ? "Kütüphaneyi kapat" : patch?.backgroundMediaId ? "Değiştir" : "Medya Kütüphanesinden Seç"}
            </button>
            {patch?.backgroundMediaId ? (
              <button type="button" onClick={() => onClear("backgroundMediaId")}>
                Kaldır
              </button>
            ) : null}
          </div>
          {picking ? (
            <MediaPicker
              selected={patch?.backgroundMediaId}
              onPick={(backgroundMediaId) => {
                onChange({ backgroundMediaId });
                setPicking(false);
              }}
            />
          ) : null}
          {hasPhoto ? <small>Kartın kendi görseli arka planın üstünde durur.</small> : null}
        </div>
        {number("borderWidth", "Kenarlık kalınlığı", Number.parseFloat(computed.borderTopWidth) || 0)}
        <OptionalColorField
          label="Kenarlık rengi"
          value={patch?.borderColor}
          fallback={toHexColor(computed.borderTopColor)}
          onChange={(borderColor) => onChange({ borderColor })}
          onClear={() => onClear("borderColor")}
        />
        {number("radius", "Köşe yuvarlama", Number.parseFloat(computed.borderTopLeftRadius) || 0)}
        <div className="visual-editor-field">
          Gölge
          <div className="visual-editor-choice">
            <button type="button" aria-pressed={!shadow} onClick={() => onClear("shadow")}>
              Yok
            </button>
            <button type="button" aria-pressed={!!shadow} onClick={() => onChange({ shadow: shadow ?? DEFAULT_SHADOW })}>
              Özel
            </button>
          </div>
        </div>
        {shadow ? (
          <div className="visual-editor-sides">
            {shadowNumber("x", "Yatay")}
            {shadowNumber("y", "Dikey")}
            {shadowNumber("blur", "Bulanıklık")}
            {shadowNumber("opacity", "Yoğunluk", "%")}
          </div>
        ) : null}
        {shadow ? (
          <ColorField label="Gölge rengi" value={shadow.color} onChange={(color) => onChange({ shadow: { ...shadow, color } })} />
        ) : null}
        {number("opacity", "Opaklık", Math.round(Number.parseFloat(computed.opacity) * 100), { unit: "%" })}
      </PanelSection>

      <PanelSection title="Gelişmiş">
        <div className="visual-editor-sides">
          {number("width", "Genişlik", rect.width)}
          {number("height", "Yükseklik", rect.height)}
          {number("minHeight", "Min. yükseklik", Number.parseFloat(computed.minHeight) || 0, { aria: "Minimum yükseklik" })}
        </div>
        {sides("padding", "İç boşluk")}
        {sides("margin", "Dış boşluk")}
        <p className="visual-editor-note">Köşedeki tutamağı sürükleyerek genişlik ve minimum yüksekliği de değiştirebilirsiniz.</p>
        <button type="button" className="visual-editor-reset" onClick={onReset} disabled={!changed}>
          Varsayılana dön
        </button>
      </PanelSection>
    </>
  );
}

export type NodeStylePatch = Partial<NodeTextStyle & NodeContainerStyle & NodeImageStyle & NodeButtonStyle & NodeIconStyle>;
export type NodeContentPatch = { text?: string; href?: string; mediaId?: string; alt?: string; icon?: NodeIcon };
type NumericStyleKey = "fontSize" | "borderWidth" | "radius" | "opacity" | "focusX" | "focusY";

const ORDER_MOVES: { move: NodeOrderMove; label: string }[] = [
  { move: "back", label: "En arkaya" },
  { move: "backward", label: "Bir arkaya" },
  { move: "forward", label: "Bir öne" },
  { move: "front", label: "En öne" },
];

export function NodeSettings({
  node,
  bounds,
  device,
  deviceLabel,
  items,
  canAdd,
  onSelect,
  onBox,
  onContent,
  onStyle,
  onClearStyle,
  onOrder,
  onDuplicate,
  onDelete,
  onResetDevice,
}: {
  node: EditorNode;
  bounds: NodeSize;
  device: NodeDevice;
  deviceLabel: string;
  items: BoxChild[];
  canAdd: boolean;
  onSelect: (id: string) => void;
  onBox: (box: NodeBox) => void;
  onContent: (patch: NodeContentPatch) => void;
  onStyle: (partial: NodeStylePatch) => void;
  onClearStyle: (key: keyof NodeStylePatch) => void;
  onOrder: (move: NodeOrderMove) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onResetDevice: () => void;
}) {
  const [picking, setPicking] = useState(node.type === "image" && !node.mediaId);
  const box = nodeBox(node, device);
  const customized = hasLayout(node, device);
  const style = (node.style ?? {}) as NodeStylePatch;
  const right = Math.round(bounds.width - box.x - box.width);
  const bottom = Math.round(bounds.height - box.y - box.height);
  const position = (label: string, value: number, apply: (next: number) => NodeBox) => (
    <OptionalNumberField
      key={label}
      label={label}
      value={value}
      placeholder={String(value)}
      onChange={(next) => {
        if (next != null) onBox(apply(next));
      }}
    />
  );
  const number = (key: NumericStyleKey, label: string, placeholder: number, min: number, max: number, unit = "px") => (
    <OptionalNumberField
      key={key}
      label={label}
      unit={unit}
      value={style[key] ?? null}
      placeholder={String(placeholder)}
      onChange={(value) => (value == null ? onClearStyle(key) : onStyle({ [key]: Math.min(max, Math.max(min, value)) }))}
    />
  );
  const color = (key: "color" | "background" | "borderColor", label: string, fallback: string) => (
    <OptionalColorField key={key} label={label} value={style[key]} fallback={fallback} onChange={(value) => onStyle({ [key]: value })} onClear={() => onClearStyle(key)} />
  );
  const weight = (
    <label className="visual-editor-field">
      Kalınlık
      <select
        aria-label="Kalınlık"
        value={style.fontWeight ?? ""}
        onChange={(event) => (event.target.value ? onStyle({ fontWeight: Number(event.target.value) as CopyWeight }) : onClearStyle("fontWeight"))}
      >
        <option value="">Varsayılan</option>
        {COPY_WEIGHTS.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <>
      <PanelSection title="İçerik" open>
        {node.type === "text" ? (
          <label className="visual-editor-field">
            Metin
            <textarea value={node.text} aria-label="Metin" rows={4} maxLength={2000} onChange={(event) => onContent({ text: event.target.value })} />
          </label>
        ) : null}
        {node.type === "button" ? (
          <>
            <label className="visual-editor-field">
              Buton metni
              <input
                value={node.text}
                aria-label="Buton metni"
                maxLength={120}
                onChange={(event) => onContent({ text: event.target.value.replace(/[\r\n]+/g, " ") })}
              />
            </label>
            <HrefField value={node.href ?? ""} onChange={(href) => onContent({ href })} />
            {node.href ? (
              <button type="button" className="visual-editor-clear" onClick={() => onContent({ href: undefined })}>
                Bağlantıyı kaldır
              </button>
            ) : (
              <small>Bağlantı yok; buton bir yere gitmez.</small>
            )}
          </>
        ) : null}
        {node.type === "image" ? (
          <div className="visual-editor-field">
            Görsel
            {node.mediaId ? (
              <div className="visual-editor-preview">
                <img src={mediaUrl(node.mediaId)} alt="" />
              </div>
            ) : null}
            <div className="visual-editor-choice">
              <button type="button" aria-expanded={picking} onClick={() => setPicking((open) => !open)}>
                {picking ? "Kütüphaneyi kapat" : node.mediaId ? "Değiştir" : "Medya Kütüphanesinden Seç"}
              </button>
            </div>
            {picking ? (
              <MediaPicker
                selected={node.mediaId}
                onPick={(mediaId) => {
                  onContent({ mediaId });
                  setPicking(false);
                }}
              />
            ) : null}
            <label className="visual-editor-field">
              Alternatif metin
              <input value={node.alt ?? ""} aria-label="Alternatif metin" maxLength={200} onChange={(event) => onContent({ alt: event.target.value })} />
            </label>
          </div>
        ) : null}
        {node.type === "icon" ? (
          <div className="visual-editor-field">
            İkon
            <div className="visual-editor-icons" role="listbox" aria-label="İkonlar">
              {NODE_ICON_NAMES.map((name) => (
                <button
                  key={name}
                  type="button"
                  role="option"
                  aria-selected={node.icon === name}
                  aria-label={NODE_ICONS[name].label}
                  title={NODE_ICONS[name].label}
                  onClick={() => onContent({ icon: name })}
                >
                  <NodeIconSvg icon={name} />
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {node.type === "container" ? (
          <>
            {items.length > 0 ? (
              <div className="visual-editor-field">
                İçindekiler
                <div className="visual-editor-children">
                  {items.map((item) => (
                    <button key={item.id} type="button" onClick={() => onSelect(item.id)}>
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <p className="visual-editor-note">
              {canAdd ? "İçine öğe eklemek için sayfadaki + Ekle düğmesini kullanın." : "Bu konteyner en derin seviyede; içine yeni öğe eklenemez."}
            </p>
          </>
        ) : null}
      </PanelSection>

      <PanelSection title="Tasarım" open>
        {node.type === "text" ? (
          <>
            <label className="visual-editor-field">
              Yazı tipi
              <select
                aria-label="Yazı tipi"
                value={style.fontFamily ?? ""}
                onChange={(event) => (event.target.value ? onStyle({ fontFamily: event.target.value as CopyFont }) : onClearStyle("fontFamily"))}
              >
                <option value="">Varsayılan</option>
                {(Object.keys(COPY_FONTS) as CopyFont[]).map((font) => (
                  <option key={font} value={font}>
                    {COPY_FONTS[font].label}
                  </option>
                ))}
              </select>
            </label>
            {weight}
            {number("fontSize", "Yazı boyutu", 18, 8, 120)}
            {color("color", "Renk", "#ffffff")}
            <div className="visual-editor-field">
              Hizalama
              <div className="visual-editor-choice">
                {(["left", "center", "right"] as CopyAlign[]).map((align) => (
                  <button key={align} type="button" aria-pressed={(style.align ?? "left") === align} onClick={() => onStyle({ align })}>
                    {align === "left" ? "Sol" : align === "center" ? "Orta" : "Sağ"}
                  </button>
                ))}
              </div>
            </div>
            <OptionalNumberField
              label="Satır aralığı"
              unit="×"
              decimal
              value={style.lineHeight ?? null}
              placeholder="1.3"
              onChange={(lineHeight) => (lineHeight == null ? onClearStyle("lineHeight") : onStyle({ lineHeight: Math.min(3, Math.max(0.8, lineHeight)) }))}
            />
          </>
        ) : null}
        {node.type === "container" ? (
          <>
            {color("background", "Arka plan rengi", "#ffffff")}
            {number("borderWidth", "Kenarlık kalınlığı", 0, 0, 20)}
            {color("borderColor", "Kenarlık rengi", "#e4d8c4")}
            {number("radius", "Köşe yuvarlama", 0, 0, 400)}
            {number("opacity", "Opaklık", 100, 10, 100, "%")}
          </>
        ) : null}
        {node.type === "image" ? (
          <>
            <div className="visual-editor-field">
              Yerleşim
              <div className="visual-editor-choice">
                {(["cover", "contain"] as const).map((fit) => (
                  <button key={fit} type="button" aria-pressed={(style.fit ?? "cover") === fit} onClick={() => onStyle({ fit })}>
                    {fit === "cover" ? "Kapla" : "Sığdır"}
                  </button>
                ))}
              </div>
            </div>
            <div className="visual-editor-sides">
              {number("focusX", "Odak yatay", 50, 0, 100, "%")}
              {number("focusY", "Odak dikey", 50, 0, 100, "%")}
            </div>
            {number("radius", "Köşe yuvarlama", 0, 0, 400)}
            {number("borderWidth", "Kenarlık kalınlığı", 0, 0, 20)}
            {color("borderColor", "Kenarlık rengi", "#e4d8c4")}
          </>
        ) : null}
        {node.type === "button" ? (
          <>
            {color("background", "Arka plan rengi", "#1e4a38")}
            {color("color", "Yazı rengi", "#fffdf8")}
            {number("fontSize", "Yazı boyutu", 15, 8, 64)}
            {weight}
            {number("borderWidth", "Kenarlık kalınlığı", 0, 0, 20)}
            {color("borderColor", "Kenarlık rengi", "#1e4a38")}
            {number("radius", "Köşe yuvarlama", 999, 0, 999)}
          </>
        ) : null}
        {node.type === "icon" ? (
          <>
            {color("color", "Renk", "#1e4a38")}
            <OptionalNumberField
              label="Boyut"
              value={Math.min(box.width, box.height)}
              placeholder={String(Math.min(box.width, box.height))}
              onChange={(size) => {
                if (size != null) onBox({ ...box, width: size, height: size });
              }}
            />
          </>
        ) : null}
      </PanelSection>

      <PanelSection title="Gelişmiş" open>
        <p className="visual-editor-device-note">
          <strong>{deviceLabel}</strong> konumu, boyutu ve yazı ölçüsü düzenleniyor.{" "}
          {device === "desktop"
            ? "Masaüstü varsayılan tasarımdır; tablet ve telefon kendi ayarı yoksa bunu orantılı küçülterek kullanır."
            : customized
              ? `Bu öğenin ${deviceLabel.toLocaleLowerCase("tr")} için ayrı ayarı var; masaüstü değişmez.`
              : `Henüz ${deviceLabel.toLocaleLowerCase("tr")} ayarı yok; masaüstü düzeni orantılı küçültülerek gösteriliyor. Taşıdığınızda, ölçü ya da yazı boyutu girdiğinizde yalnız bu cihaz için ayrı ayar oluşur.`}
        </p>
        {device !== "desktop" && customized ? (
          <button type="button" className="visual-editor-reset" onClick={onResetDevice}>
            Yalnızca {deviceLabel.toLocaleLowerCase("tr")} ayarlarını sıfırla
          </button>
        ) : null}
        <div className="visual-editor-sides">
              {position("Soldan", box.x, (x) => ({ ...box, x }))}
              {position("Üstten", box.y, (y) => ({ ...box, y }))}
              {position("Sağdan", right, (value) => ({ ...box, x: bounds.width - value - box.width }))}
              {position("Alttan", bottom, (value) => ({ ...box, y: bounds.height - value - box.height }))}
              {position("Genişlik", box.width, (width) => ({ ...box, width }))}
              {position("Yükseklik", box.height, (height) => ({ ...box, height }))}
        </div>
        <p className="visual-editor-note">
          Mesafeler {Math.round(bounds.width)}×{Math.round(bounds.height)} px kapsayıcıya göredir. Seçili öğeyi sürükleyebilir, tutamaçlarla boyutlandırabilir veya ok tuşlarıyla (Shift ile 10 px) kaydırabilirsiniz.
        </p>
        <div className="visual-editor-field">
          Katman sırası
          <div className="visual-editor-sides">
            {ORDER_MOVES.map(({ move, label }) => (
              <button key={move} type="button" className="visual-editor-reset" onClick={() => onOrder(move)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="visual-editor-reset" onClick={onDuplicate}>
          Çoğalt
        </button>
        <button type="button" className="visual-editor-reset is-danger" onClick={onDelete}>
          Sil
        </button>
        <p className="visual-editor-note">Silinen öğe Geri al (Ctrl+Z) ile geri getirilebilir; kaydetmeden yayındaki sayfa etkilenmez.</p>
      </PanelSection>
    </>
  );
}