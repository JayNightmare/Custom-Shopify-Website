"use client";

import React from "react";
import AddToCartButton from "./AddToCartButton";
import Price from "./Price";

export type Variant = {
  id: string;
  title: string;
  availableForSale?: boolean;
  price?: { amount: string; currencyCode: string };
};

type VariantSelectorProps = {
  variants: Variant[];
  defaultVariantId?: string;
  className?: string;
};

export default function VariantSelector({
  variants,
  defaultVariantId,
  className,
}: VariantSelectorProps) {
  const [selected, setSelected] = React.useState<string>(
    defaultVariantId || variants[0]?.id || ""
  );
  const [qty, setQty] = React.useState<number>(1);

  const current = variants.find((v) => v.id === selected);

  return (
    <div className={className}>
      {variants.length > 1 && (
        <div className="mb-3">
          <label htmlFor="variant" className="block text-sm mb-1">
            Variant
          </label>
          <select
            id="variant"
            className="w-full border rounded-md px-2 py-2 bg-transparent"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id} disabled={!v.availableForSale}>
                {v.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-4 mb-4">
        <div>
          <label htmlFor="qty" className="block text-sm mb-1">
            Quantity
          </label>
          <input
            id="qty"
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            className="w-20 border rounded-md px-2 py-2 bg-transparent"
          />
        </div>
        {current?.price ? (
          <div className="mt-6">
            <Price
              amount={current.price.amount}
              currencyCode={current.price.currencyCode}
              className="text-lg"
            />
          </div>
        ) : null}
      </div>

      <AddToCartButton merchandiseId={selected} quantity={qty} />
    </div>
  );
}
