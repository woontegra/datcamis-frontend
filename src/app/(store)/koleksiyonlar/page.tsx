import type { Metadata } from "next";
import Link from "next/link";
import { getCollections } from "@/lib/store";

export const metadata: Metadata = { title: "Koleksiyonlar" };

export default async function CollectionsPage() {
  const collections = await getCollections().catch(() => null);
  return (
    <div className="wrap section">
      <p className="eyebrow">Raflar</p>
      <h1>Koleksiyonlar</h1>
      {collections ? (
        <div className="collection-grid">
          {collections.map((collection) => (
            <Link className="panel" key={collection.id} href={`/koleksiyonlar/${collection.slug}`}>
              <h2>{collection.name}</h2>
              <p>{collection.description}</p>
            </Link>
          ))}
        </div>
      ) : <p>Koleksiyonlar yüklenemedi.</p>}
    </div>
  );
}
