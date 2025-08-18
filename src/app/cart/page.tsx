import Link from "next/link";
import CartLineItem, { type CartLine } from "@/components/CartLineItem";
import CartSummary from "@/components/CartSummary";
import { getCartIdFromCookie } from "@/lib/cookies";
import { graphqlStorefront, cacheTags, isShopifyMock } from "@/lib/shopify/storefront";
import { QUERY_GET_CART } from "@/lib/shopify/queries";

type CartQuery = {
  cart?: {
    id: string;
    checkoutUrl?: string | null;
    totalQuantity: number;
    lines: {
      edges: Array<{
        node: {
          id: string;
          quantity: number;
          merchandise: {
            id: string;
            title: string;
            product: { handle: string; title: string };
            price?: { amount: string; currencyCode: string };
          };
        };
      }>;
    };
    cost?: {
      subtotalAmount?: { amount: string; currencyCode: string } | null;
      totalAmount?: { amount: string; currencyCode: string } | null;
    };
  } | null;
};

export default async function CartPage() {
  let cartId = await getCartIdFromCookie();

  // In mock mode (no SHOPIFY env), fall back to the deterministic mock id
  if (!cartId && isShopifyMock) {
    cartId = "mock-cart-id";
  }

  if (!cartId) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-4">Your cart</h1>
        <p className="text-neutral-600 dark:text-neutral-300">
          Your cart is empty.
        </p>
        <div className="mt-4">
          <Link
            href="/"
            className="inline-flex items-center rounded-md bg-black px-4 py-2 text-white hover:bg-neutral-800"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  const data = await graphqlStorefront<CartQuery>(
    QUERY_GET_CART,
    { id: cartId },
    {
      revalidate: 0,
      cacheTags: [cacheTags.cart(cartId)],
      cache: "no-store",
    }
  );

  const cart = data?.cart || null;
  const lines = cart?.lines?.edges?.map((e) => e.node) ?? [];

  const isEmpty =
    !cart || !lines.length || (cart.totalQuantity ?? 0) <= 0;

  if (isEmpty) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-4">Your cart</h1>
        <p className="text-neutral-600 dark:text-neutral-300">
          Your cart is empty.
        </p>
        <div className="mt-4">
          <Link
            href="/"
            className="inline-flex items-center rounded-md bg-black px-4 py-2 text-white hover:bg-neutral-800"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  const cartLines: CartLine[] = lines.map((l) => ({
    id: l.id,
    quantity: l.quantity,
    merchandise: {
      id: l.merchandise.id,
      title: l.merchandise.title,
      product: { handle: l.merchandise.product.handle, title: l.merchandise.product.title },
      price: l.merchandise.price,
    },
  }));

  const subtotal = cart?.cost?.subtotalAmount ?? null;
  const checkoutUrl = cart?.checkoutUrl ?? null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <h1 className="text-2xl font-semibold mb-4">Your cart</h1>
        <div className="divide-y divide-black/10 dark:divide-white/15">
          {cartLines.map((line) => (
            <CartLineItem key={line.id} cartId={cart.id} line={line} />
          ))}
        </div>
      </div>
      <aside className="lg:col-span-1">
        <CartSummary subtotal={subtotal ?? undefined} checkoutUrl={checkoutUrl} className="sticky top-6" />
      </aside>
    </div>
  );
}
