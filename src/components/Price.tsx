import React from "react";

type PriceProps = {
  amount: string | number;
  currencyCode?: string;
  className?: string;
};

function formatAmount(amount: string | number, currencyCode = "USD") {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${num} ${currencyCode}`;
  }
}

export function Price({ amount, currencyCode = "USD", className }: PriceProps) {
  return <span className={className}>{formatAmount(amount, currencyCode)}</span>;
}

export default Price;
