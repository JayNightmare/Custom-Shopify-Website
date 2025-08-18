"use client";

import React from "react";
import { useState, useTransition } from "react";

type AddToCartButtonProps = {
  merchandiseId: string;
  quantity?: number;
  className?: string;
  children?: React.ReactNode;
  onAdded?: (result: { ok: boolean; error?: string }) => void;
};

export default function AddToCartButton({
  merchandiseId,
  quantity = 1,
  className,
  children = "Add to cart",
  onAdded,
}: AddToCartButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const handleClick = () => {
    setError(null);
    setOk(false);
    startTransition(async () => {
      try {
        // Ensure a cart exists (also sets httpOnly cookie)
        await fetch("/api/cart/create", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        });

        // Now add the line
        const res = await fetch("/api/cart/add", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            // cartId is derived from cookie on server route
            cartId: "from-cookie",
            lines: [{ merchandiseId, quantity }],
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const msg = data?.error || "Failed to add to cart";
          setError(msg);
          setOk(false);
          onAdded?.({ ok: false, error: msg });
          return;
        }
        setOk(true);
        onAdded?.({ ok: true });
      } catch (e: any) {
        const msg = String(e?.message ?? e);
        setError(msg);
        setOk(false);
        onAdded?.({ ok: false, error: msg });
      }
    });
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center rounded-md bg-black px-4 py-2 text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Adding..." : children}
      </button>
      {ok && (
        <p className="mt-2 text-sm text-green-600" role="status" aria-live="polite">
          Added to cart.
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600" role="status" aria-live="assertive">
          {error}
        </p>
      )}
    </div>
  );
}
