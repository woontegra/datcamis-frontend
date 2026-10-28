"use client";

import { createContext, useContext } from "react";
import { FALLBACK_BRAND } from "@/lib/brand";
import { EMPTY_SETTINGS, type PublicSettings } from "@/lib/site-settings";

const SiteSettingsContext = createContext<PublicSettings>(EMPTY_SETTINGS);

export function SiteSettingsProvider({ value, children }: { value: PublicSettings; children: React.ReactNode }) {
  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}

export function useBrand() {
  const { general } = useSiteSettings();
  return {
    name: general.storeName || FALLBACK_BRAND.name,
    slogan: general.configured ? general.slogan : FALLBACK_BRAND.slogan,
    logo: general.logoUrl || FALLBACK_BRAND.logo,
  };
}
