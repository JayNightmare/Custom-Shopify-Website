import { NextResponse } from "next/server";
import { z } from "zod";
import { graphqlStorefront } from "@/lib/shopify/storefront";
import { MUTATION_CART_CREATE } from "@/lib/shopify/queries";
import { CartCreateBodySchema, parseJsonBodyStrict } from "@/lib/schema";
import { setCartIdCookie } from "@/lib/cookies";

export const runtime = "nodejs";

type CartCreateResponse = {
    cartCreate: {
        cart: {
            id: string;
            checkoutUrl: string;
            totalQuantity: number;
            lines: { edges: Array<{ node: { id: string } }> };
        } | null;
        userErrors: Array<{ field?: string[]; message: string }>;
    };
};

export async function POST(req: Request) {
    try {
        const strict = await parseJsonBodyStrict(req);
        if (!strict.ok) {
            return NextResponse.json(
                { error: "Invalid body", message: "Malformed JSON" },
                { status: 400 }
            );
        }
        const parsed = CartCreateBodySchema.safeParse(strict.data);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid body", issues: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const variables = {
            lines: parsed.data.lines,
            attributes: parsed.data.attributes,
        };

        const data = await graphqlStorefront<CartCreateResponse>(
            MUTATION_CART_CREATE,
            variables,
            { revalidate: 0, cache: "no-store" }
        );

        const { cart, userErrors } = data.cartCreate;
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

        await setCartIdCookie(cart.id);

        return NextResponse.json({ cart }, { status: 200 });
    } catch (err: any) {
        return NextResponse.json(
            { error: "Unexpected error", message: String(err?.message ?? err) },
            { status: 500 }
        );
    }
}
