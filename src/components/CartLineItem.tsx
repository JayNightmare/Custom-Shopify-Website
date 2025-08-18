"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Price from "./Price";
import { removeLines, updateLine } from "@/lib/cart-client";

export type CartLine = {
  id: string;
  quantity: number;
  merchandise: {
    id: string; // variant id
    title: string;
    product: { handle: string; title: string };
    price?: { amount: string; currencyCode: string };
  };
};

type CartLineItemProps = {
  cartId: string;
  line: CartLine;
};

export default function CartLineItem({ cartId, line }: CartLineItemProps) {
  const router = useRouter();
  const [qty, setQty] = React.useState<number>(line.quantity);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const doUpdate = async (newQty: number) => {
    setPending(true);
    setError(null);
    try {
      const res = await updateLine(cartId, line.id, newQty);
      if (!res.ok) {
        setError(res.error);
      } else {
        router.refresh();
      }
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setPending(false);
    }
  };

  const onRemove = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await removeLines(cartId, [line.id]);
      if (!res.ok) {
        setError(res.error);
      } else {
        router.refresh();
      }
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-black/10 dark:border-white/15">
      <div className="min-w-0">
        <Link
          href={`/product/${line.merchandise.product.handle}`}
          className="font-medium hover:underline underline-offset-4"
        >
          {line.merchandise.product.title}
        </Link>
        <div className="text-sm text-neutral-600 dark:text-neutral-300">
          {line.merchandise.title}
        </div>
        {line.merchandise.price ? (
          <div className="text-sm mt-1">
            <Price
              amount={line.merchandise.price.amount}
              currencyCode={line.merchandise.price.currencyCode}
            />
          </div>
        ) : null}
        {error && (
          <div className="text-sm text-red-600 mt-1" role="alert">
            {error}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <label className="sr-only" htmlFor={`qty-${line.id}`}>
          Quantity
        </label>
        <input
          id={`qty-${line.id}`}
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
          onBlur={() => {
            if (qty !== line.quantity) {
              doUpdate(qty);
            }
          }}
          className="w-20 border rounded-md px-2 py-2 bg-transparent"
          disabled={pending}
        />
        <button
          type="button"
          onClick={onRemove}
          disabled={pending}
          className="text-sm text-red-600 hover:underline underline-offset-4 disabled:opacity-50"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
