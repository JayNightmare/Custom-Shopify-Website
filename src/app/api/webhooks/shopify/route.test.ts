import { describe, it, expect, beforeEach, vi } from "vitest";
import crypto from "node:crypto";

// Mock Next.js server utilities used by route handlers to avoid loading Next internals
vi.mock("next/server", () => {
    return {
        NextResponse: class NextResponse {
            constructor(_body?: any, init?: { status?: number }) {
                return new Response(_body, {
                    status: init?.status ?? 200,
                    headers: { "content-type": "application/json" },
                }) as any;
            }
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

function hmacFor(body: string, secret: string) {
    return crypto
        .createHmac("sha256", secret)
        .update(body, "utf8")
        .digest("base64");
}

function makeReq(rawBody: string, headers: Record<string, string>) {
    return new Request("http://localhost/api/webhooks/shopify", {
        method: "POST",
        headers,
        body: rawBody,
    });
}

describe("POST /api/webhooks/shopify", () => {
    beforeEach(() => {
        process.env.SHOPIFY_WEBHOOK_SECRET = "testsecret";
    });

    it("rejects invalid HMAC with 401", async () => {
        const rawBody = JSON.stringify({ foo: "bar" });
        const req = makeReq(rawBody, {
            "x-shopify-topic": "orders/create",
            "x-shopify-hmac-sha256": "invalid-hmac",
            "x-shopify-shop-domain": "example.myshopify.com",
            "content-type": "application/json",
        });

        const res = await POST(req);
        expect(res.status).toBe(401);
        const json = await (res as Response).json();
        expect(json.error).toBe("Invalid HMAC");
    });

    it("accepts valid HMAC and returns 200 for products/update", async () => {
        const payload = { handle: "mock-product", action: "update" };
        const rawBody = JSON.stringify(payload);
        const sig = hmacFor(rawBody, process.env.SHOPIFY_WEBHOOK_SECRET!);
        const req = makeReq(rawBody, {
            "x-shopify-topic": "products/update",
            "x-shopify-hmac-sha256": sig,
            "x-shopify-shop-domain": "example.myshopify.com",
            "content-type": "application/json",
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
    });
});
