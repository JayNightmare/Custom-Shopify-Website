import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock cookie helpers to avoid relying on next/headers in unit tests
vi.mock("@/lib/cookies", () => ({
    setCartIdCookie: vi.fn(async () => {}),
    getCartIdFromCookie: vi.fn(async () => undefined),
    clearCartIdCookie: vi.fn(async () => {}),
}));

// Ensure Storefront mock mode (no env)
delete (process.env as any).SHOPIFY_STORE_DOMAIN;
delete (process.env as any).SHOPIFY_STOREFRONT_TOKEN;

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

function makeReq(body?: any): Request {
    return new Request("http://localhost/api/cart/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: body === undefined ? "{}" : JSON.stringify(body),
    });
}

async function readJson(res: any): Promise<any> {
    // NextResponse extends the standard Web Response; use the global Response
    const r = res as unknown as Response;
    return await r.json();
}

describe("POST /api/cart/create", () => {
    beforeEach(() => {
        // keep mock mode
        delete (process.env as any).SHOPIFY_STORE_DOMAIN;
        delete (process.env as any).SHOPIFY_STOREFRONT_TOKEN;
    });

    it("returns 400 on invalid body (non-JSON)", async () => {
        const req = new Request("http://localhost/api/cart/create", {
            method: "POST",
            body: "{invalid",
            headers: { "content-type": "application/json" },
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
        const json = await readJson(res);
        expect(json.error).toBe("Invalid body");
    });

    it("creates a cart and sets cookie (mock mode)", async () => {
        const req = makeReq({}); // empty body is allowed by schema
        const res = await POST(req);
        expect(res.status).toBe(200);
        const json = await readJson(res);
        expect(json.cart).toBeDefined();
        expect(json.cart.id).toBe("mock-cart-id");
        expect(json.cart.checkoutUrl).toContain("mock-checkout");
    });
});
