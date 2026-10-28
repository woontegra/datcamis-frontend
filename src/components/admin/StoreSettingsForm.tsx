"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, browserApi } from "@/lib/api";
import { formatTry } from "@/lib/money";
import {
  draftToPayload,
  shippingExamples,
  tabOfSection,
  TABS,
  toDraft,
  type Draft,
  type Section,
  type SettingsInfo,
  type StoreSettings,
  type TabKey,
} from "@/lib/settings-form";
import { dispatchPhrase } from "@/lib/site-settings";
import { FALLBACK_BRAND } from "@/lib/brand";
import { ProductMediaPicker } from "./ProductMediaPicker";

const FALLBACK_LOGO = FALLBACK_BRAND.logo;
const LEAVE_TEXT = "Kaydedilmemiş değişiklikler var. Sayfadan çıkmak istiyor musunuz?";
const TAB_TEXT = "Bu sekmede kaydedilmemiş değişiklikler var. Sekme değiştirirseniz bu değişiklikler silinir. Devam edilsin mi?";

const TAB_ICONS: Record<TabKey, string[]> = {
  genel: ["M4 10h16v10H4Z", "M3 10l2-5h14l2 5", "M9 20v-5h6v5"],
  firma: ["M4 8h16v11H4Z", "M9 8V5h6v3", "M4 13h16"],
  iletisim: ["M6 4h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4 6a2 2 0 0 1 2-2Z"],
  sosyal: ["M7 4h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z", "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"],
  kargo: ["M3 7h11v9H3Z", "M14 10h4l3 3v3h-7", "M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z", "M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"],
  odeme: ["M3 6h18v12H3Z", "M3 10h18", "M7 15h4"],
  siparis: ["M4 7.5 12 4l8 3.5v9L12 20l-8-3.5Z", "M12 20V11", "M4 7.5l8 3.5 8-3.5"],
  duyuru: ["M4 10v4h3l6 4V6L7 10Z", "M17 9a4 4 0 0 1 0 6"],
};

function TabIcon({ name }: { name: TabKey }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TAB_ICONS[name].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

/** One form row: its boxes share the card width equally (3 → 2 → 1 as the screen narrows). */
function Row({ cols, children }: { cols: 1 | 2 | 3; children: React.ReactNode }) {
  return <div className={`settings-row cols-${cols}`}>{children}</div>;
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && !error ? <small className="settings-hint">{hint}</small> : null}
      {error ? <span className="field-error" role="alert">{error}</span> : null}
    </label>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label className="settings-switch">
      <input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="settings-switch-track" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

function Card({ title, hint, children, tone }: { title: string; hint?: string; children: React.ReactNode; tone?: "preview" }) {
  return (
    <section className={`settings-card${tone ? ` is-${tone}` : ""}`}>
      <h2>{title}</h2>
      {hint ? <p className="settings-card-hint">{hint}</p> : null}
      {children}
    </section>
  );
}

function sameSections(a: Draft, b: Draft, sections: Section[]) {
  return sections.every((section) => JSON.stringify(a[section]) === JSON.stringify(b[section]));
}

function mediaUrl(id: string) {
  return id ? `/api/v1/media/${id}/file` : "";
}

export function StoreSettingsForm({ initial, info, fallbackSlogan }: { initial: StoreSettings; info: SettingsInfo; fallbackSlogan: string }) {
  const start = useMemo(() => {
    const draft = toDraft(initial);
    if (!info.savedSections.includes("general") && !draft.general.slogan) draft.general.slogan = fallbackSlogan;
    return draft;
  }, [initial, info.savedSections, fallbackSlogan]);
  const [saved, setSaved] = useState<Draft>(start);
  const [draft, setDraft] = useState<Draft>(start);
  const [tab, setTab] = useState<TabKey>("genel");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const allSections = TABS.flatMap((item) => item.sections);
  const dirtySections = allSections.filter((section) => !sameSections(draft, saved, [section]));
  const dirty = dirtySections.length > 0;

  useEffect(() => {
    document.querySelector(".settings-tabs [aria-selected='true']")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [tab]);

  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    function onClick(event: MouseEvent) {
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || event.defaultPrevented) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (window.confirm(LEAVE_TEXT)) return;
      event.preventDefault();
      event.stopPropagation();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  function update<S extends keyof Draft, K extends keyof Draft[S]>(section: S, key: K, value: Draft[S][K]) {
    setDraft((current) => ({ ...current, [section]: { ...current[section], [key]: value } }));
    setErrors((current) => {
      const path = `${String(section)}.${String(key)}`;
      if (!current[path]) return current;
      const next = { ...current };
      delete next[path];
      return next;
    });
    setMessage(null);
  }

  function switchTab(next: TabKey) {
    if (next === tab) return;
    const sections = TABS.find((item) => item.key === tab)!.sections;
    if (!sameSections(draft, saved, sections)) {
      if (!window.confirm(TAB_TEXT)) return;
      setDraft((current) => {
        const reverted = { ...current };
        for (const section of sections) (reverted as Record<string, unknown>)[section] = saved[section];
        return reverted;
      });
      setErrors({});
    }
    setMessage(null);
    setTab(next);
  }

  async function save() {
    if (!dirty || busy) return;
    const { payload, errors: found } = draftToPayload(draft, dirtySections);
    if (Object.keys(found).length) {
      setErrors(found);
      setMessage({ tone: "error", text: "Bazı alanlar hatalı. Lütfen kırmızı uyarıları düzeltin." });
      const first = tabOfSection(Object.keys(found)[0].split(".")[0]);
      if (first && first !== tab) setTab(first);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const body = await browserApi<{ data: { settings: StoreSettings; changed: number } }>("/admin/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      const next = toDraft(body.data.settings);
      setSaved(next);
      setDraft(next);
      setErrors({});
      setMessage({ tone: "ok", text: body.data.changed ? "Kaydedildi." : "Değişiklik yoktu." });
    } catch (error) {
      if (error instanceof ApiError && error.details?.length) {
        const mapped = Object.fromEntries(error.details.map((item) => [item.path, item.message]));
        setErrors(mapped);
        const first = tabOfSection(error.details[0].path.split(".")[0]);
        if (first && first !== tab) setTab(first);
        setMessage({ tone: "error", text: error.message });
      } else if (error instanceof ApiError && error.status === 403) {
        setMessage({ tone: "error", text: "Ayarları yalnızca Owner ve Admin değiştirebilir." });
      } else {
        setMessage({ tone: "error", text: "Kaydedilemedi, lütfen tekrar deneyin." });
      }
    } finally {
      setBusy(false);
    }
  }

  const e = (path: string) => errors[path];

  return (
    <div className="settings-page">
      <div className="admin-top settings-top">
        <h1>Ayarlar</h1>
        {dirty ? <span className="settings-dirty">Kaydedilmemiş değişiklik var</span> : null}
        <button className="green-btn settings-save" type="button" disabled={!dirty || busy} onClick={() => void save()}>
          {busy ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
      {message ? <p className={`settings-message is-${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>{message.text}</p> : null}
      <div className="settings-layout">
        <nav className="settings-tabs" aria-label="Ayar sekmeleri" role="tablist">
          {TABS.map((item) => {
            const tabDirty = item.sections.some((section) => dirtySections.includes(section));
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={tab === item.key}
                className={tab === item.key ? "is-active" : undefined}
                onClick={() => switchTab(item.key)}
              >
                <TabIcon name={item.key} />
                <span>{item.label}</span>
                {tabDirty ? <span className="settings-tab-dot" aria-label="kaydedilmedi" /> : null}
              </button>
            );
          })}
        </nav>
        <div className="settings-panel" role="tabpanel">
          {tab === "genel" ? (
            <>
              <Card title="Mağaza" hint="Mağaza adı ve slogan sitenin üst ve alt kısmında görünür.">
                <Row cols={2}>
                  <Field label="Mağaza adı" error={e("general.storeName")}>
                    <input value={draft.general.storeName} maxLength={80} onChange={(event) => update("general", "storeName", event.target.value)} />
                  </Field>
                  <Field label="Slogan" error={e("general.slogan")}>
                    <input value={draft.general.slogan} maxLength={160} onChange={(event) => update("general", "slogan", event.target.value)} />
                  </Field>
                </Row>
              </Card>
              <Card title="Logo ve site ikonu" hint="Medya Kütüphanesinden seçin. Logo seçilmezse mevcut logo kullanılır.">
                <Row cols={2}>
                  <MediaSlot
                    label="Logo"
                    value={draft.general.logoMediaId}
                    fallback={FALLBACK_LOGO}
                    fallbackText="Mevcut logo kullanılıyor"
                    error={e("general.logoMediaId")}
                    usage="logo"
                    onChange={(id) => update("general", "logoMediaId", id)}
                  />
                  <MediaSlot
                    label="Site ikonu (favicon)"
                    value={draft.general.iconMediaId}
                    fallbackText="Tarayıcının varsayılan ikonu"
                    error={e("general.iconMediaId")}
                    usage="logo"
                    onChange={(id) => update("general", "iconMediaId", id)}
                  />
                </Row>
              </Card>
            </>
          ) : null}

          {tab === "firma" ? (
            <Card title="Firma bilgileri" hint="İletişim sayfasında ve yasal metinlerde kullanılır. Boş alanlar sitede görünmez.">
              <Row cols={2}>
                <Field label="Ticari unvan" error={e("company.legalName")}>
                  <input value={draft.company.legalName} maxLength={200} onChange={(event) => update("company", "legalName", event.target.value)} />
                </Field>
                <Field label="Vergi dairesi" error={e("company.taxOffice")}>
                  <input value={draft.company.taxOffice} maxLength={80} onChange={(event) => update("company", "taxOffice", event.target.value)} />
                </Field>
              </Row>
              <Row cols={3}>
                <Field label="Vergi no" error={e("company.taxNumber")} hint="10 hane">
                  <input value={draft.company.taxNumber} inputMode="numeric" maxLength={10} onChange={(event) => update("company", "taxNumber", event.target.value.replace(/\D/g, ""))} />
                </Field>
                <Field label="MERSİS no" error={e("company.mersisNo")} hint="16 hane">
                  <input value={draft.company.mersisNo} inputMode="numeric" maxLength={16} onChange={(event) => update("company", "mersisNo", event.target.value.replace(/\D/g, ""))} />
                </Field>
                <Field label="Ticaret sicil no" error={e("company.tradeRegistryNo")}>
                  <input value={draft.company.tradeRegistryNo} maxLength={40} onChange={(event) => update("company", "tradeRegistryNo", event.target.value)} />
                </Field>
              </Row>
              <Row cols={1}>
                <Field label="KEP adresi" error={e("company.kepAddress")}>
                  <input type="email" value={draft.company.kepAddress} maxLength={160} placeholder="ornek@hs01.kep.tr" onChange={(event) => update("company", "kepAddress", event.target.value)} />
                </Field>
              </Row>
              <Row cols={1}>
                <Field label="Firma adresi" error={e("company.address")}>
                  <textarea rows={3} value={draft.company.address} maxLength={400} onChange={(event) => update("company", "address", event.target.value)} />
                </Field>
              </Row>
            </Card>
          ) : null}

          {tab === "iletisim" ? (
            <Card title="İletişim" hint="Footer ve İletişim sayfasında görünür. Boş bırakılan alan sitede gösterilmez.">
              <Row cols={3}>
                <Field label="E-posta" error={e("contact.email")}>
                  <input type="email" value={draft.contact.email} maxLength={160} onChange={(event) => update("contact", "email", event.target.value)} />
                </Field>
                <Field label="Telefon" error={e("contact.phone")}>
                  <input type="tel" value={draft.contact.phone} maxLength={24} placeholder="0252 123 45 67" onChange={(event) => update("contact", "phone", event.target.value)} />
                </Field>
                <Field label="WhatsApp" error={e("contact.whatsapp")}>
                  <input type="tel" value={draft.contact.whatsapp} maxLength={24} placeholder="0532 123 45 67" onChange={(event) => update("contact", "whatsapp", event.target.value)} />
                </Field>
              </Row>
              <Row cols={1}>
                <Field label="Çalışma saatleri" error={e("contact.workingHours")}>
                  <input value={draft.contact.workingHours} maxLength={200} placeholder="Hafta içi 09.00–18.00" onChange={(event) => update("contact", "workingHours", event.target.value)} />
                </Field>
              </Row>
              <Row cols={1}>
                <Field label="Adres" error={e("contact.address")}>
                  <textarea rows={3} value={draft.contact.address} maxLength={400} onChange={(event) => update("contact", "address", event.target.value)} />
                </Field>
              </Row>
              <Row cols={1}>
                <Field label="Harita bağlantısı" error={e("contact.mapUrl")}>
                  <input type="url" value={draft.contact.mapUrl} maxLength={500} placeholder="https://maps.google.com/…" onChange={(event) => update("contact", "mapUrl", event.target.value)} />
                </Field>
              </Row>
            </Card>
          ) : null}

          {tab === "sosyal" ? (
            <Card title="Sosyal medya" hint="Yalnızca doldurulan hesaplar sitede ikon olarak görünür.">
              {([["instagram", "facebook"], ["tiktok", "youtube"], ["x", "pinterest"]] as const).map((pair) => (
                <Row key={pair[0]} cols={2}>
                  {pair.map((key) => (
                    <Field key={key} label={{ instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube", x: "X", pinterest: "Pinterest" }[key]} error={e(`social.${key}`)}>
                      <input type="url" value={draft.social[key]} maxLength={500} placeholder="https://…" onChange={(event) => update("social", key, event.target.value)} />
                    </Field>
                  ))}
                </Row>
              ))}
            </Card>
          ) : null}

          {tab === "kargo" ? <ShippingTab draft={draft} info={info} errors={errors} update={update} /> : null}

          {tab === "odeme" ? (
            <>
              <Card title="Havale / EFT" hint="Açıkken müşteri ödeme sayfasında havaleyi seçebilir; banka bilgileri sipariş sonrası gösterilir.">
                <Switch checked={draft.havale.enabled} onChange={(value) => update("havale", "enabled", value)} label="Havale / EFT aktif" />
                <Row cols={2}>
                  <Field label="Banka adı" error={e("havale.bankName")}>
                    <input value={draft.havale.bankName} maxLength={80} onChange={(event) => update("havale", "bankName", event.target.value)} />
                  </Field>
                  <Field label="Hesap sahibi" error={e("havale.accountHolder")}>
                    <input value={draft.havale.accountHolder} maxLength={120} onChange={(event) => update("havale", "accountHolder", event.target.value)} />
                  </Field>
                </Row>
                <Row cols={1}>
                  <Field label="IBAN" error={e("havale.iban")}>
                    <input value={draft.havale.iban} maxLength={34} autoComplete="off" placeholder="TR00 0000 0000 0000 0000 0000 00" onChange={(event) => update("havale", "iban", event.target.value.toUpperCase())} />
                  </Field>
                </Row>
                <Row cols={1}>
                  <Field label="Müşteri notu" error={e("havale.note")}>
                    <textarea rows={2} value={draft.havale.note} maxLength={300} onChange={(event) => update("havale", "note", event.target.value)} />
                  </Field>
                </Row>
              </Card>
              <Card title="Kartla ödeme (PayTR)">
                <p className={`settings-status ${info.paytrConfigured ? "is-on" : "is-off"}`}>
                  {info.paytrConfigured ? "PayTR anahtarları tanımlı" : "PayTR anahtarları tanımlı değil"}
                </p>
                <p className="settings-card-hint">Anahtarlar sunucu ortamında saklanır; buradan görüntülenemez veya değiştirilemez.</p>
              </Card>
              <Card title="En düşük sipariş tutarı" hint="Ürün toplamı bu tutarın altındaysa sipariş verilemez. Boş bırakılırsa sınır yoktur.">
                <Row cols={1}>
                  <Field label="En düşük tutar (TL)" error={e("payment.minOrderAmount")}>
                    <MoneyInput value={draft.payment.minOrderAmount} placeholder="Sınır yok" onChange={(value) => update("payment", "minOrderAmount", value)} />
                  </Field>
                </Row>
              </Card>
            </>
          ) : null}

          {tab === "siparis" ? (
            <>
              <Card title="Sipariş numarası" hint="Önek yalnızca bundan sonraki siparişlere uygulanır; eski sipariş numaraları değişmez.">
                <Row cols={1}>
                  <Field label="Sipariş no öneki" error={e("order.numberPrefix")} hint={`Örnek: ${(draft.order.numberPrefix.trim().toUpperCase() || "")}1001`}>
                    <input value={draft.order.numberPrefix} maxLength={10} onChange={(event) => update("order", "numberPrefix", event.target.value.toUpperCase())} />
                  </Field>
                </Row>
              </Card>
              <Card title="Havale ödeme süresi" hint="Teşekkür sayfasında ve müşterinin sipariş detayında gösterilir. Süre dolunca sipariş otomatik iptal edilmez.">
                <Row cols={1}>
                  <Field label="Ödeme bekleme süresi (gün)" error={e("order.havalePaymentDays")} hint="Boş bırakılırsa süre gösterilmez.">
                    <input value={draft.order.havalePaymentDays} inputMode="numeric" maxLength={2} onChange={(event) => update("order", "havalePaymentDays", event.target.value.replace(/\D/g, ""))} />
                  </Field>
                </Row>
                {draft.order.havalePaymentDays ? (
                  <p className="settings-preview-line">Müşteri görür: “Lütfen <strong>{draft.order.havalePaymentDays} gün içinde</strong> ödeme yapın.”</p>
                ) : null}
              </Card>
            </>
          ) : null}

          {tab === "duyuru" ? (
            <>
              <Card title="Duyuru bandı" hint="Sitenin en üstünde ince bir bant olarak görünür.">
                <Switch checked={draft.announcement.enabled} onChange={(value) => update("announcement", "enabled", value)} label="Duyuru bandı açık" />
                <Row cols={1}>
                  <Field label="Duyuru metni" error={e("announcement.text")}>
                    <textarea rows={2} value={draft.announcement.text} maxLength={240} onChange={(event) => update("announcement", "text", event.target.value)} />
                  </Field>
                </Row>
                {draft.announcement.enabled && draft.announcement.text.trim() ? <p className="notice settings-notice-preview">{draft.announcement.text}</p> : null}
              </Card>
              <Card title="Bakım modu" hint="Açıkken ziyaretçiler yalnızca “Yakında açılıyoruz” sayfasını görür; sepet ve ödeme kapanır. Admin paneli ve giriş yapmış yöneticiler etkilenmez.">
                <Switch checked={draft.maintenance.enabled} onChange={(value) => update("maintenance", "enabled", value)} label="Bakım modu açık" />
                {draft.maintenance.enabled ? <p className="settings-status is-warn">Kaydettiğinizde mağaza ziyaretçilere kapanır.</p> : null}
              </Card>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MoneyInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <span className="settings-money">
      <input value={value} inputMode="decimal" placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      <span aria-hidden="true">TL</span>
    </span>
  );
}

function ShippingTab({
  draft,
  info,
  errors,
  update,
}: {
  draft: Draft;
  info: SettingsInfo;
  errors: Record<string, string>;
  update: <S extends keyof Draft, K extends keyof Draft[S]>(section: S, key: K, value: Draft[S][K]) => void;
}) {
  const { payload } = draftToPayload(draft, ["shipping"]);
  const shipping = payload.shipping!;
  const threshold = shipping.freeShippingEnabled ? shipping.freeShippingThreshold : null;
  const examples = shippingExamples(shipping.flatFee, threshold);
  const phrase = dispatchPhrase(draft.shipping.dispatchTime);
  return (
    <>
      <Card title="Kargo ücreti" hint="Sepette ve ödeme sayfasında otomatik hesaplanır.">
        <Row cols={3}>
          <Field label="Sabit kargo ücreti (KDV dahil)" error={errors["shipping.flatFee"]}>
            <MoneyInput value={draft.shipping.flatFee} placeholder="0,00" onChange={(value) => update("shipping", "flatFee", value)} />
          </Field>
          <Field label="Bu tutar ve üzeri ücretsiz kargo" error={errors["shipping.freeShippingThreshold"]}>
            <MoneyInput value={draft.shipping.freeShippingThreshold} placeholder="Örn. 750,00" onChange={(value) => update("shipping", "freeShippingThreshold", value)} />
          </Field>
          <div className="settings-row-switch">
            <Switch checked={draft.shipping.freeShippingEnabled} onChange={(value) => update("shipping", "freeShippingEnabled", value)} label="Ücretsiz kargo sınırı aktif" />
          </div>
        </Row>
      </Card>
      <Card title="Gönderim">
        <Row cols={2}>
          <Field label="Varsayılan kargo firması" error={errors["shipping.defaultCarrier"]}>
            <select value={draft.shipping.defaultCarrier} onChange={(event) => update("shipping", "defaultCarrier", event.target.value)}>
              <option value="">Seçilmedi</option>
              {info.carriers.map((carrier) => <option key={carrier} value={carrier}>{carrier}</option>)}
            </select>
          </Field>
          <Field label="Kargoya verme süresi" error={errors["shipping.dispatchTime"]}>
            <input value={draft.shipping.dispatchTime} maxLength={80} placeholder="1–2 iş günü" onChange={(event) => update("shipping", "dispatchTime", event.target.value)} />
          </Field>
        </Row>
      </Card>
      <Card title="Müşteri böyle görecek" tone="preview">
        <div className="settings-preview-grid">
          {examples.map((example) => (
            <div key={example.basket} className="settings-preview-box">
              <p>Sepet {formatTry(example.basket)}</p>
              <p className="settings-preview-ship">
                Kargo: {example.shipping === 0 ? <strong className="is-free">Ücretsiz</strong> : <strong>{formatTry(example.shipping)}</strong>}
              </p>
              {example.remaining ? <p className="settings-preview-hint">{formatTry(example.remaining)} daha ekleyin, kargo bedava</p> : null}
              {!example.remaining && phrase ? <p className="settings-preview-muted">{phrase}</p> : null}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function MediaSlot({
  label,
  value,
  fallback,
  fallbackText,
  error,
  usage,
  onChange,
}: {
  label: string;
  value: string;
  fallback?: string;
  fallbackText: string;
  error?: string;
  usage: "logo";
  onChange: (id: string) => void;
}) {
  const src = mediaUrl(value) || fallback || "";
  return (
    <div className="field settings-media">
      <span>{label}</span>
      <div className="settings-media-row">
        {src ? <img src={src} alt="" /> : <span className="settings-media-empty" aria-hidden="true" />}
        <div>
          <p className="settings-card-hint">{value ? "Medya Kütüphanesinden seçildi" : fallbackText}</p>
          {value ? <button className="text-btn" type="button" onClick={() => onChange("")}>Kaldır</button> : null}
        </div>
      </div>
      <ProductMediaPicker usage={usage} onPick={(item) => onChange(item.id)} />
      {error ? <span className="field-error" role="alert">{error}</span> : null}
    </div>
  );
}
