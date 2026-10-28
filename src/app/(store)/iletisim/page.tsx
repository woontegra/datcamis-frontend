import type { Metadata } from "next";
import { SocialIcon } from "@/components/store/SocialIcon";
import { SOCIAL_KEYS, SOCIAL_LABELS, telLink, whatsappLink } from "@/lib/site-settings";
import { getSettings } from "@/lib/store";

export const metadata: Metadata = { title: "İletişim" };

export default async function ContactPage() {
  const { contact, company, social } = await getSettings();
  const socials = SOCIAL_KEYS.filter((key) => social[key]);
  const companyRows = [
    ["Ticari unvan", company.legalName],
    ["Vergi dairesi", company.taxOffice],
    ["Vergi no", company.taxNumber],
    ["MERSİS no", company.mersisNo],
    ["Ticaret sicil no", company.tradeRegistryNo],
    ["KEP adresi", company.kepAddress],
    ["Firma adresi", company.address],
  ].filter(([, value]) => value);
  const hasContact = Boolean(contact.email || contact.phone || contact.whatsapp || contact.address || contact.workingHours);
  return (
    <div className="wrap section contact-page">
      <p className="eyebrow">Atölye</p>
      <h1>İletişim</h1>
      {hasContact ? (
        <dl className="contact-list">
          {contact.email ? <div><dt>E-posta</dt><dd><a href={`mailto:${contact.email}`}>{contact.email}</a></dd></div> : null}
          {contact.phone ? <div><dt>Telefon</dt><dd><a href={telLink(contact.phone)}>{contact.phone}</a></dd></div> : null}
          {contact.whatsapp ? <div><dt>WhatsApp</dt><dd><a href={whatsappLink(contact.whatsapp)} target="_blank" rel="noopener noreferrer">{contact.whatsapp}</a></dd></div> : null}
          {contact.address ? <div><dt>Adres</dt><dd>{contact.address}{contact.mapUrl ? <> · <a href={contact.mapUrl} target="_blank" rel="noopener noreferrer">Haritada gör</a></> : null}</dd></div> : null}
          {contact.workingHours ? <div><dt>Çalışma saatleri</dt><dd>{contact.workingHours}</dd></div> : null}
        </dl>
      ) : (
        <p className="lede">İletişim bilgileri yakında burada olacak.</p>
      )}
      {socials.length ? (
        <div className="footer-social contact-social" aria-label="Sosyal medya">
          {socials.map((key) => (
            <a key={key} href={social[key]} target="_blank" rel="noopener noreferrer" aria-label={SOCIAL_LABELS[key]} title={SOCIAL_LABELS[key]}>
              <SocialIcon name={key} />
            </a>
          ))}
        </div>
      ) : null}
      {companyRows.length ? (
        <section className="contact-company">
          <h2>Firma bilgileri</h2>
          <dl className="contact-list">
            {companyRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
        </section>
      ) : null}
    </div>
  );
}
