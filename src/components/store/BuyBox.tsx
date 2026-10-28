"use client";

import { useState } from "react";
import { useCart } from "./cart-context";
import type { StoreOptionGroup, Variant } from "@/lib/types";
import { Price } from "@/components/store/Price";
import { customerMessage } from "@/lib/api";
import { ADD_FAILED } from "./cart-context";

type Picks = Record<string, string>;

function valueOf(variant: Variant, optionId: string) {
  return variant.options.find((option) => option.optionId === optionId)?.valueId;
}

function matches(variant: Variant, picks: Picks) {
  return Object.entries(picks).every(([optionId, valueId]) => valueOf(variant, optionId) === valueId);
}

function initialPicks(variants: Variant[], groups: StoreOptionGroup[]): Picks {
  const start = variants.find((item) => item.isDefault && item.inStock) ?? variants.find((item) => item.inStock);
  if (!start) return {};
  return Object.fromEntries(groups.map((group) => [group.id, valueOf(start, group.id)]).filter((entry): entry is [string, string] => Boolean(entry[1])));
}

function AddButton({ variant, missing }: { variant: Variant | null; missing: string[] }) {
  const { add } = useCart();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <>
      <button
        className="green-btn"
        type="button"
        disabled={!variant || !variant.inStock || pending}
        onClick={async () => {
          if (!variant) return;
          setPending(true);
          setMessage("");
          try {
            await add(variant.id, 1);
            setMessage("Sepete eklendi.");
          } catch (error) {
            setMessage(customerMessage(error, ADD_FAILED));
          } finally {
            setPending(false);
          }
        }}
      >
        Sepete ekle
      </button>
      {missing.length ? <p className="buy-hint">Sepete eklemek için {missing.join(", ")} seçin.</p> : null}
      {message ? <p>{message}</p> : null}
    </>
  );
}

export function BuyBox({
  variants,
  options = [],
  onVariantChange,
}: {
  variants: Variant[];
  options?: StoreOptionGroup[];
  onVariantChange?: (variant: Variant | null) => void;
}) {
  const groups = options.filter((group) => group.values.length && variants.some((variant) => valueOf(variant, group.id)));
  const [variantId, setVariantId] = useState(variants.find((item) => item.isDefault)?.id || variants[0]?.id);
  const [picks, setPicks] = useState<Picks>(() => initialPicks(variants, groups));

  if (!variants.length) return <p>Varyant yok.</p>;

  if (!groups.length) {
    const selected = variants.find((item) => item.id === variantId) || variants[0];
    return (
      <div>
        <p><span className="quiet-note">Fiyat</span> <Price amount={selected.priceAmount} compareAtAmount={selected.compareAtAmount} /></p>
        {variants.length > 1 ? (
          <div className="option-row" role="group" aria-label="Seçenek">
            {variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                className="text-btn"
                aria-pressed={variant.id === selected.id}
                onClick={() => {
                  setVariantId(variant.id);
                  onVariantChange?.(variant);
                }}
              >
                {variant.name}
              </button>
            ))}
          </div>
        ) : null}
        <p>{selected.inStock ? "Stokta" : "Tükendi"}</p>
        <AddButton variant={selected} missing={[]} />
      </div>
    );
  }

  const complete = groups.every((group) => picks[group.id]);
  const selected = complete ? variants.find((variant) => groups.every((group) => valueOf(variant, group.id) === picks[group.id])) ?? null : null;
  const prices = variants.map((variant) => variant.priceAmount);
  const shown = selected ?? variants.reduce((low, variant) => (variant.priceAmount < low.priceAmount ? variant : low), variants[0]);
  const missing = groups.filter((group) => !picks[group.id]).map((group) => group.name.toLocaleLowerCase("tr-TR"));

  function available(group: StoreOptionGroup, valueId: string) {
    const others = Object.fromEntries(Object.entries(picks).filter(([optionId]) => optionId !== group.id));
    return variants.some((variant) => variant.inStock && valueOf(variant, group.id) === valueId && matches(variant, others));
  }

  function choose(group: StoreOptionGroup, valueId: string | null) {
    const next = { ...picks };
    if (valueId) next[group.id] = valueId;
    else delete next[group.id];
    setPicks(next);
    const full = groups.every((item) => next[item.id]);
    onVariantChange?.(full ? variants.find((variant) => groups.every((item) => valueOf(variant, item.id) === next[item.id])) ?? null : null);
  }

  return (
    <div className="buy-box">
      <p>
        <span className="quiet-note">Fiyat</span> <Price amount={shown.priceAmount} compareAtAmount={selected ? selected.compareAtAmount : null} />
        {!selected && Math.min(...prices) !== Math.max(...prices) ? <span className="quiet-note"> · seçime göre değişir</span> : null}
      </p>
      {groups.map((group) => {
        const pickedName = group.values.find((value) => value.id === picks[group.id])?.name;
        return (
          <div className="buy-option" key={group.id}>
            <p className="buy-option-label">
              {group.name}
              {pickedName ? <strong>: {pickedName}</strong> : null}
            </p>
            {group.displayType === "SELECT" ? (
              <select
                className="buy-select"
                value={picks[group.id] ?? ""}
                aria-label={group.name}
                onChange={(event) => choose(group, event.target.value || null)}
              >
                <option value="">Seçin</option>
                {group.values.map((value) => {
                  const ok = available(group, value.id);
                  return <option key={value.id} value={value.id} disabled={!ok}>{value.name}{ok ? "" : " — stokta yok"}</option>;
                })}
              </select>
            ) : (
              <div className={group.displayType === "SWATCH" ? "option-row buy-swatches" : "option-row"} role="group" aria-label={group.name}>
                {group.values.map((value) => {
                  const ok = available(group, value.id);
                  const pressed = picks[group.id] === value.id;
                  const onClick = () => choose(group, pressed ? null : value.id);
                  return group.displayType === "SWATCH" ? (
                    <button
                      key={value.id}
                      type="button"
                      className={`buy-swatch${ok ? "" : " is-off"}`}
                      style={{ background: value.colorHex || "#cccccc" }}
                      aria-pressed={pressed}
                      aria-label={ok ? value.name : `${value.name} (stokta yok)`}
                      title={ok ? value.name : `${value.name} — stokta yok`}
                      disabled={!ok && !pressed}
                      onClick={onClick}
                    />
                  ) : (
                    <button
                      key={value.id}
                      type="button"
                      className={`text-btn${ok ? "" : " is-off"}`}
                      aria-pressed={pressed}
                      title={ok ? undefined : "Stokta yok"}
                      disabled={!ok && !pressed}
                      onClick={onClick}
                    >
                      {value.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <p>{selected ? (selected.inStock ? "Stokta" : "Tükendi") : complete ? "Bu kombinasyon satışta değil" : ""}</p>
      <AddButton variant={selected} missing={missing} />
    </div>
  );
}
