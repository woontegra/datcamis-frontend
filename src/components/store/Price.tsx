import { formatTry } from "@/lib/money";

export function Price({ amount, compareAtAmount }: { amount: number; compareAtAmount?: number | null }) {
  const showCompare = compareAtAmount != null && compareAtAmount > amount;
  return (
    <span>
      {showCompare ? <s className="quiet-note" style={{ marginRight: "0.4rem" }}>{formatTry(compareAtAmount)}</s> : null}
      {formatTry(amount)}
    </span>
  );
}
