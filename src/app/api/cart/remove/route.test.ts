import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock cookie helpers
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
    return new Request("http://localhost/api/cart/remove", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
}

async function readJson(res: any): Promise<any> {
    const r = res as unknown as Response;
    return await r.json();
}

describe("POST /api/cart/remove", () => {
    beforeEach(() => {
        delete (process.env as any).SHOPIFY_STORE_DOMAIN;
        delete (process.env as any).SHOPIFY_STOREFRONT_TOKEN;
    });

    it("returns 400 on invalid body", async () => {
        // missing lineIds
        const req = makeReq({ cartId: "mock-cart-id", lineIds: [] });
        const res = await POST(req);
        expect(res.status).toBe(400);
        const json = await readJson(res);
        expect(json.error).toBe("Invalid body");
    });

    it("removes cart lines (mock mode)", async () => {
        const req = makeReq({
            cartId: "mock-cart-id",
            lineIds: ["mock-line-id"],
        });
        const res = await POST(req);
        expect(res.status).toBe(200);
        const json = await readJson(res);
        expect(json.cart).toBeDefined();
        expect(json.cart.totalQuantity).toBe(0);
    });
});
