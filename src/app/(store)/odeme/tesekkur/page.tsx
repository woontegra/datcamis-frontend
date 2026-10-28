import { ThanksView } from "./ThanksView";

export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ k?: string }> }) {
  const { k = "" } = await searchParams;
  return <ThanksView accessKey={k.trim()} />;
}
