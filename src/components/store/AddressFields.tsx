"use client";

import { PlaceSelect } from "@/components/store/PlaceSelect";
import type { CheckoutAddressInput } from "@/lib/invoice";
import { PROVINCE_NAMES, districtsOf } from "@/lib/turkey-locations";

function FieldError({ message }: { message?: string }) {
  return <span className="field-error">{message || "\u00a0"}</span>;
}

type AddressFieldsProps<T extends CheckoutAddressInput> = {
  value: T;
  onChange: (next: T) => void;
  errors: Record<string, string>;
  errorPrefix: string;
  afterName?: React.ReactNode;
  children?: React.ReactNode;
};

export function AddressFields<T extends CheckoutAddressInput>({ value, onChange, errors, errorPrefix, afterName, children }: AddressFieldsProps<T>) {
  const error = (field: string) => errors[errorPrefix ? `${errorPrefix}.${field}` : field];
  const set = (key: keyof CheckoutAddressInput, next: string) => onChange({ ...value, [key]: next });
  return (
    <div className="form-grid two">
      <label className="field span-2">Ad soyad
        <input name="fullName" autoComplete="name" value={value.fullName} onChange={(event) => set("fullName", event.target.value)} />
        <FieldError message={error("fullName")} />
      </label>
      {afterName}
      <label className={`field ${afterName ? "" : "span-2"}`}>Telefon
        <input name="phone" type="tel" inputMode="tel" autoComplete="tel" value={value.phone} onChange={(event) => set("phone", event.target.value)} />
        <FieldError message={error("phone")} />
      </label>
      <label className="field span-2">Adres
        <input name="line1" autoComplete="street-address" value={value.line1} onChange={(event) => set("line1", event.target.value)} />
        <FieldError message={error("line1")} />
      </label>
      <PlaceSelect
        label="İl"
        value={value.city}
        options={PROVINCE_NAMES}
        placeholder="İl seçin"
        error={error("city")}
        onChange={(city) => onChange({ ...value, city, district: city === value.city ? value.district : "" })}
      />
      <PlaceSelect
        label="İlçe"
        value={value.district}
        options={districtsOf(value.city)}
        disabled={!value.city}
        placeholder={value.city ? "İlçe seçin" : "Önce il seçin"}
        error={error("district")}
        onChange={(district) => set("district", district)}
      />
      <label className={`field ${children ? "" : "span-2"}`}>Posta kodu
        <input inputMode="numeric" autoComplete="postal-code" value={value.postalCode} onChange={(event) => set("postalCode", event.target.value)} />
        <FieldError message={error("postalCode")} />
      </label>
      {children}
    </div>
  );
}
