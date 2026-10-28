"use client";

import { telLink } from "@/lib/site-settings";
import { useBrand, useSiteSettings } from "./site-settings-context";

export function MaintenancePage() {
  const brand = useBrand();
  const { contact } = useSiteSettings();
  return (
    <main className="maintenance-page">
      <div className="maintenance-card">
        <img src={brand.logo} alt="" width={72} height={72} />
        <p className="brand-name">{brand.name}</p>
        <h1>Yakında açılıyoruz</h1>
        <p>Mağazamızı sizin için hazırlıyoruz. Kısa süre sonra yeniden buradayız.</p>
        {contact.email || contact.phone ? (
          <p className="maintenance-contact">
            {contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : null}
            {contact.email && contact.phone ? " · " : null}
            {contact.phone ? <a href={telLink(contact.phone)}>{contact.phone}</a> : null}
          </p>
        ) : null}
      </div>
    </main>
  );
}
