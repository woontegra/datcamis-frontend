"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, browserApi } from "@/lib/api";
import { productPhotoSlot } from "@/lib/home-visual";
import { formatTry } from "@/lib/money";
import { CopyButton } from "@/components/store/CopyButton";
import { formatIbanGroups } from "@/lib/iban";

type ThanksData = {
  number: string;
  subtotalAmount?: number;
  shippingAmount?: number;
  totalAmount: number;
  paid: boolean;
  paymentProvider: "havale" | "paytr" | "other";
  havale: { bankName: string; accountHolder: string; iban: string; paymentDueDays?: number | null } | null;
  shipping: { fullName: string; line1: string; district: string; city: string };
  items: Array<{
    productName: string;
    variantName: string;
    quantity: number;
    lineAmount: number;
    image: { url: string; alt: string } | null;
  }>;
};

export function ThanksView({ accessKey }: { accessKey: string }) {
  const [data, setData] = useState<ThanksData | null>(null);
  const [missing, setMissing] = useState(!accessKey);

  useEffect(() => {
    if (!accessKey) {
      setMissing(true);
      return;
    }
    let cancelled = false;
    void browserApi<{ data: ThanksData }>(`/checkout/thanks/${encodeURIComponent(accessKey)}`)
      .then((body) => {
        if (!cancelled) {
          setData(body.data);
          setMissing(false);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setData(null);
          setMissing(true);
          if (!(error instanceof ApiError)) setMissing(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accessKey]);

  if (missing && !data) {
    return (
      <div className="wrap section thanks-page">
        <p className="eyebrow">Ödeme</p>
        <h1>Siparişiniz alınamadı</h1>
        <p className="thanks-lede">Bu sayfa yalnızca siparişi tamamlayan kişi için geçerlidir.</p>
        <Link className="green-btn" href="/urunler">Alışverişe devam et</Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="wrap section thanks-page">
        <p className="eyebrow">Ödeme</p>
        <p className="thanks-lede">Sipariş bilgisi yükleniyor…</p>
      </div>
    );
  }

  const showHavale = Boolean(data.havale?.iban);
  const steps = showHavale
    ? ["Havaleyi yapın", "Ödemeyi onaylarız", "Kargoya veririz"]
    : data.paid
      ? ["Ödemeniz alındı", "Hazırlıyoruz", "Kargoya veririz"]
      : ["Ödeme onayı", "Hazırlıyoruz", "Kargoya veririz"];

  const summary = (
    <>
      <h2>Sipariş özeti</h2>
      <ul className="summary-items">
        {data.items.map((item, index) => (
          <li key={`${item.productName}-${index}`}>
            <img src={item.image?.url || productPhotoSlot("limon-cicegi-kolonyasi")} alt="" />
            <div>
              <p>{item.productName}</p>
              <p>{item.variantName} × {item.quantity}</p>
            </div>
            <span>{formatTry(item.lineAmount)}</span>
          </li>
        ))}
      </ul>
      {data.subtotalAmount !== undefined ? <div className="summary-row"><span>Ara toplam</span><span>{formatTry(data.subtotalAmount)}</span></div> : null}
      {data.shippingAmount !== undefined ? <div className="summary-row"><span>Kargo</span><span>{data.shippingAmount === 0 ? "Ücretsiz" : formatTry(data.shippingAmount)}</span></div> : null}
      <div className="summary-row is-total"><span>Toplam</span><span>{formatTry(data.totalAmount)}</span></div>
      <div className="summary-row thanks-ship">
        <span>Teslimat</span>
        <p>
          {data.shipping.fullName}
          {data.shipping.line1 ? <><br />{data.shipping.line1}</> : null}
          {data.shipping.district || data.shipping.city ? (
            <>
              <br />
              {[data.shipping.district, data.shipping.city].filter(Boolean).join(" / ")}
            </>
          ) : null}
        </p>
      </div>
      <Link className="green-btn" href="/urunler">Alışverişe devam et</Link>
    </>
  );

  return (
    <div className="wrap section thanks-page">
      <p className="eyebrow">Ödeme</p>
      <div className="thanks-intro">
        <div className="thanks-check" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="28" height="28">
            <path d="M6 12.5 10.2 16.5 18 8.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1>Siparişiniz alındı</h1>
        <p className="thanks-lede">
          {showHavale
            ? `${data.number} numaralı siparişiniz için teşekkür ederiz. Ödemeniz hesabımıza geçtiğinde siparişinizi hazırlamaya başlayacağız.`
            : data.paid
              ? `${data.number} numaralı siparişiniz için teşekkür ederiz. Ödemeniz alındı, siparişinizi hazırlamaya başlayacağız.`
              : `${data.number} numaralı siparişiniz için teşekkür ederiz. Ödeme onayı bekleniyor.`}
        </p>
      </div>

      <div className="checkout-layout">
        <div className="checkout-form">
          {showHavale && data.havale ? (
            <section className="checkout-block">
              <h2>Havale / EFT bilgileri</h2>
              <div className="thanks-amount">
                <span>Ödenecek tutar</span>
                <strong>{formatTry(data.totalAmount)}</strong>
              </div>
              <div className="thanks-row">
                <span>Banka</span>
                <p>{data.havale.bankName}</p>
              </div>
              <div className="thanks-row">
                <span>Alıcı</span>
                <p>{data.havale.accountHolder}</p>
                <CopyButton value={data.havale.accountHolder} label="Alıcı" />
              </div>
              <div className="thanks-row">
                <span>IBAN</span>
                <p className="thanks-iban">{formatIbanGroups(data.havale.iban)}</p>
                <CopyButton value={data.havale.iban.replace(/\s+/g, "").toUpperCase()} label="IBAN" />
              </div>
              <div className="thanks-row">
                <span>Açıklama</span>
                <p>{data.number}</p>
                <CopyButton value={data.number} label="Açıklama" />
              </div>
              <p className="thanks-warn">
                Ödemenizin eşleşmesi için açıklamaya mutlaka <strong>{data.number}</strong> yazın.
              </p>
              {data.havale.paymentDueDays ? (
                <p className="thanks-due">Lütfen <strong>{data.havale.paymentDueDays} gün içinde</strong> ödeme yapın.</p>
              ) : null}
            </section>
          ) : (
            <section className="checkout-block thanks-paid">
              <h2>{data.paid ? "Ödemeniz alındı" : "Ödeme onayı"}</h2>
              <p>{data.paid ? "Kart ödemeniz onaylandı. Siparişinizi hazırlamaya başlıyoruz." : "Kart ödemesinin banka onayı bekleniyor."}</p>
            </section>
          )}

          <section className="checkout-block">
            <h2>Sonraki adımlar</h2>
            <ol className="thanks-steps">
              {steps.map((label, index) => (
                <li key={label}>
                  <span className={index === 0 ? "is-on" : ""}>{index + 1}</span>
                  {label}
                </li>
              ))}
            </ol>
          </section>
        </div>
        <aside className="order-summary">
          {summary}
        </aside>
      </div>
    </div>
  );
}
