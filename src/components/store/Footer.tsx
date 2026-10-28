"use client";

import Link from "next/link";
import { editorLinkKey, FOOTER_COLUMN_IDS } from "@/lib/editor-catalog";
import { SOCIAL_KEYS, SOCIAL_LABELS, telLink, whatsappLink } from "@/lib/site-settings";
import type { FooterMenu } from "@/lib/types";
import { MenuLink } from "./MenuLink";
import { NewsletterForm } from "./NewsletterForm";
import { useBrand, useSiteSettings } from "./site-settings-context";
import { SocialIcon } from "./SocialIcon";

export function Footer({ columns }: { columns: FooterMenu[] }) {
  const brand = useBrand();
  const { contact, social } = useSiteSettings();
  const socials = SOCIAL_KEYS.filter((key) => social[key]);
  const hasContact = Boolean(contact.email || contact.phone || contact.whatsapp);
  return (
    <footer className="footer" data-editor-id="frame.footer">
      <div className={`wrap footer-grid${columns.length > 2 ? " has-wide-menu" : ""}`}>
        <div className="footer-brand" data-editor-id="frame.footer.brand">
          <Link href="/" className="brand-lockup">
            <img src={brand.logo} alt="" width={44} height={44} data-editor-id="frame.footer.brand.mark" />
            <span>
              <strong className="brand-name" data-editor-id="frame.footer.brand.name">{brand.name}</strong>
              {brand.slogan ? <small className="brand-tag" data-editor-id="frame.footer.brand.tag">{brand.slogan}</small> : null}
            </span>
          </Link>
          <p data-editor-id="frame.footer.brand.text">Limon, zeytin ve badem. Ege kıyısından ilham alan kolonya evi.</p>
          {hasContact ? (
            <ul className="footer-contact">
              {contact.email ? <li><a href={`mailto:${contact.email}`}>{contact.email}</a></li> : null}
              {contact.phone ? <li><a href={telLink(contact.phone)}>{contact.phone}</a></li> : null}
              {contact.whatsapp ? <li><a href={whatsappLink(contact.whatsapp)} target="_blank" rel="noopener noreferrer">WhatsApp: {contact.whatsapp}</a></li> : null}
            </ul>
          ) : null}
          {socials.length ? (
            <div className="footer-social" aria-label="Sosyal medya">
              {socials.map((key) => (
                <a key={key} href={social[key]} target="_blank" rel="noopener noreferrer" aria-label={SOCIAL_LABELS[key]} title={SOCIAL_LABELS[key]}>
                  <SocialIcon name={key} />
                </a>
              ))}
            </div>
          ) : null}
        </div>
        {columns.map((column, index) => {
          const id = FOOTER_COLUMN_IDS[index];
          return (
            <div key={id} data-editor-id={id}>
              <p className="eyebrow" data-editor-id={`${id}.title`}>{column.title}</p>
              {column.items.flatMap((item) => [item, ...(item.children ?? [])]).map((item, at) => (
                <p key={`${item.href}-${at}`}><MenuLink item={item} editorId={`${id}.${editorLinkKey(item.label)}`} /></p>
              ))}
            </div>
          );
        })}
        <NewsletterForm title="Bahçeden haber" text="Yeni notlar için e-posta bırakın." editorId="frame.footer.newsletter" />
      </div>
    </footer>
  );
}
