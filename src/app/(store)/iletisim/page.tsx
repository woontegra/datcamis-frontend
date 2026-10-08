import type { Metadata } from "next";
import { getSettings } from "@/lib/store";

export const metadata: Metadata = { title: "İletişim" };

export default async function ContactPage() {
  const settings = await getSettings();
  const email = typeof settings.contactEmail === "string" ? settings.contactEmail : "hello@datcamis.local";
  return (
    <div className="wrap section">
      <p className="eyebrow">Atölye</p>
      <h1>İletişim</h1>
      <p className="lede">Bu adres seed iletişim kaydıdır, yayındaki bir müşteri hizmeti hattı değildir.</p>
      <p><a href={`mailto:${email}`}>{email}</a></p>
    </div>
  );
}
