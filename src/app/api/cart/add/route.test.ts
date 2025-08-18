import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock cookie helpers to avoid relying on next/headers in unit tests
vi.mock("@/lib/cookies", () => ({
    setCartIdCookie: vi.fn(async () => {}),
    getCartIdFromCookie: vi.fn(async () => undefined),
    clearCartIdCookie: vi.fn(async () => {}),
}));

// Force Storefront mock mode (no env)
delete (process.env as any).SHOPIFY_STORE_DOMAIN;
delete (process.env as any).SHOPIFY_STOREFRONT_TOKEN;

// Mock Next.js server utilities used by route handlers
vi.mock("next/server", () => {
    return {
        NextResponse: class NextResponse {
            static json(body: any, init?: { status?: number }) {
                return new Response(JSON.stringify(body), {
                    status: init?.status ?? 200,
                    headers: { "content-type": "application/json" },
                });
            }
        },
    };
});

vi.mock("next/cache", () => {
    return {
        revalidateTag: (_tag: string) => {},
    };
});

import { POST } from "./route";

function makeReq(body: any): Request {
    return new Request("http://localhost/api/cart/add", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
}

async function readJson(res: any): Promise<any> {
    const r = res as unknown as Response;
    return await r.json();
}

describe("POST /api/cart/add", () => {
    beforeEach(() => {
        delete (process.env as any).SHOPIFY_STORE_DOMAIN;
        delete (process.env as any).SHOPIFY_STOREFRONT_TOKEN;
    });

    it("returns 400 on invalid body", async () => {
        // missing lines
        const req = makeReq({ cartId: "" });
        const res = await POST(req);
        expect(res.status).toBe(400);
        const json = await readJson(res);
        expect(json.error).toBe("Invalid body");
    });

    it("adds a line to cart (mock mode)", async () => {
        const req = makeReq({
            cartId: "mock-cart-id",
            lines: [
                {
                    merchandiseId: "gid://shopify/ProductVariant/1",
                    quantity: 2,
                },
            ],
        });
        const res = await POST(req);
        expect(res.status).toBe(200);
        const json = await readJson(res);
        expect(json.cart).toBeDefined();
        expect(json.cart.totalQuantity).toBe(2);
        expect(json.cart.lines.edges[0].node.quantity).toBe(2);
    });
});
