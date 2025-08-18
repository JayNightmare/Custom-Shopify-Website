import Price from "./Price";

type CartSummaryProps = {
  subtotal?: { amount: string; currencyCode: string } | null;
  checkoutUrl?: string | null;
  className?: string;
};

export default function CartSummary({
  subtotal,
  checkoutUrl,
  className,
}: CartSummaryProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between py-3 border-t border-black/10 dark:border-white/15">
        <span className="text-sm text-neutral-600 dark:text-neutral-300">Subtotal</span>
        <span className="text-base font-medium">
          {subtotal ? (
            <Price amount={subtotal.amount} currencyCode={subtotal.currencyCode} />
          ) : (
            "—"
          )}
        </span>
      </div>
      <p className="text-xs text-neutral-500 mt-1">
        Taxes and shipping calculated at checkout.
      </p>
      <div className="mt-4">
        {checkoutUrl ? (
          <a
            href={checkoutUrl}
            className="inline-flex items-center rounded-md bg-black px-4 py-2 text-white hover:bg-neutral-800"
          >
            Checkout
          </a>
        ) : (
          <button
            type="button"
            className="inline-flex items-center rounded-md bg-black/50 px-4 py-2 text-white cursor-not-allowed"
            disabled
          >
            Checkout
          </button>
        )}
      </div>
    </div>
  );
}
