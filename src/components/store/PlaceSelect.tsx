"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { filterPlaces } from "@/lib/turkey-locations";

type PlaceSelectProps = {
  label: string;
  value: string;
  options: string[];
  disabled?: boolean;
  placeholder: string;
  error?: string;
  onChange: (value: string) => void;
};

export function PlaceSelect({ label, value, options, disabled, placeholder, error, onChange }: PlaceSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLLabelElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const matches = useMemo(() => filterPlaces(options, query), [options, query]);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  function pick(name: string) {
    onChange(name);
    setQuery(name);
    setOpen(false);
  }

  return (
    <label className="field place-select" ref={rootRef}>
      {label}
      <div className="place-select-control">
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={open ? query : value}
          onFocus={() => {
            if (disabled) return;
            setQuery("");
            setOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              setQuery(value);
            }
            if (event.key === "Enter" && open && matches[0]) {
              event.preventDefault();
              pick(matches[0]);
            }
          }}
        />
        {open && !disabled ? (
          <ul id={listId} className="place-select-list" role="listbox">
            {matches.length ? matches.map((item) => (
              <li key={item} role="option" aria-selected={item === value}>
                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => pick(item)}>
                  {item}
                </button>
              </li>
            )) : <li className="place-select-empty">Sonuç yok</li>}
          </ul>
        ) : null}
      </div>
      <span className="field-error">{error || "\u00a0"}</span>
    </label>
  );
}
