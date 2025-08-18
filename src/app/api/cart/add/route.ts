import { NextResponse } from "next/server";
import { graphqlStorefront } from "@/lib/shopify/storefront";
import { MUTATION_CART_LINES_ADD } from "@/lib/shopify/queries";
import { CartLinesAddBodySchema, parseJsonBody } from "@/lib/schema";
import { setCartIdCookie, getCartIdFromCookie } from "@/lib/cookies";

export const runtime = "nodejs";

type CartLinesAddResponse = {
    cartLinesAdd: {
        cart: {
            id: string;
            checkoutUrl: string;
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
                        };
                    };
                }>;
            };
        } | null;
        userErrors: Array<{ field?: string[]; message: string }>;
    };
};

export async function POST(req: Request) {
    try {
        const json = (await parseJsonBody(req)) as unknown;
        const parsed = CartLinesAddBodySchema.safeParse(json);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid body", issues: parsed.error.flatten() },
                { status: 400 }
            );
        }

        let cartId = parsed.data.cartId;
        if (cartId === "from-cookie") {
            const fromCookie = await getCartIdFromCookie();
            if (fromCookie) {
                cartId = fromCookie;
            } else {
                return NextResponse.json(
                    { error: "No cart cookie found. Create a cart first." },
                    { status: 400 }
                );
            }
        }

        const variables = {
            cartId,
            lines: parsed.data.lines,
        };

        const data = await graphqlStorefront<CartLinesAddResponse>(
            MUTATION_CART_LINES_ADD,
            variables,
            { revalidate: 0, cache: "no-store" }
        );

        const { cart, userErrors } = data.cartLinesAdd;
        if (userErrors?.length) {
            return NextResponse.json(
                { error: "Shopify error", details: userErrors },
                { status: 400 }
            );
        }
        if (!cart) {
            return NextResponse.json(
                { error: "No cart returned from Shopify" },
                { status: 500 }
            );
        }

        // Ensure cookie persists latest cart id
        await setCartIdCookie(cart.id);

        return NextResponse.json({ cart }, { status: 200 });
    } catch (err: any) {
        return NextResponse.json(
            { error: "Unexpected error", message: String(err?.message ?? err) },
            { status: 500 }
        );
    }
}
