import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { revalidate } from "@/lib/cache";
import { webhookLogs } from "@/lib/mongo";
import { ShopifyWebhookHeadersSchema } from "@/lib/schema";

/**
 * Shopify Webhook Handler
 * - Verifies HMAC using SHOPIFY_WEBHOOK_SECRET
 * - Handles:
 *   - orders/create  -> log OK
 *   - products/update -> revalidate product and collection tags when possible
 *   - app/uninstalled -> log and optionally clean up (noop here)
 * - On verification failure, store an error log (if Mongo configured)
 */

export const runtime = "nodejs";

function verifyShopifyHmac(
    rawBody: string,
    hmacHeader: string | null
): boolean {
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (!secret || !hmacHeader) return false;
    const digest = crypto
        .createHmac("sha256", secret)
        .update(rawBody, "utf8")
        .digest("base64");
    // Use timing-safe compare
    const a = Buffer.from(digest);
    const b = Buffer.from(hmacHeader);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
    const raw = await req.text();

    // Validate headers
    const headersObj: Record<string, string> = {
        "x-shopify-topic": req.headers.get("x-shopify-topic") || "",
        "x-shopify-hmac-sha256": req.headers.get("x-shopify-hmac-sha256") || "",
        "x-shopify-shop-domain": req.headers.get("x-shopify-shop-domain") || "",
    };
    const headersParsed = ShopifyWebhookHeadersSchema.safeParse(headersObj);
    if (!headersParsed.success) {
        return NextResponse.json({ error: "Invalid headers" }, { status: 400 });
    }

    const { "x-shopify-topic": topic, "x-shopify-hmac-sha256": hmac } =
        headersParsed.data;

    const valid = verifyShopifyHmac(raw, hmac);
    if (!valid) {
        try {
            const coll = await webhookLogs();
            await coll.insertOne({
                topic: topic as any,
                status: "error",
                payload: { invalidHmac: true },
                error: "Invalid HMAC",
                createdAt: new Date(),
            });
        } catch {
            // ignore if Mongo not configured
        }
        return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
    }

    // Parse the body now that we've verified HMAC
    let payload: any = {};
    try {
        payload = raw ? JSON.parse(raw) : {};
    } catch {
        // non-JSON payload
        payload = {};
    }

    try {
        switch (topic) {
            case "orders/create": {
                // Example: just log OK for audit
                try {
                    const coll = await webhookLogs();
                    await coll.insertOne({
                        topic: "orders/create",
                        status: "ok",
                        payload,
                        error: null,
                        createdAt: new Date(),
                    });
                } catch {
                    // ignore
                }
                break;
            }

            case "products/update": {
                // Attempt to revalidate product and collection tags
                // payload might include product handle; if not, skip
                const handle =
                    payload?.handle ||
                    payload?.product?.handle ||
                    payload?.body?.handle ||
                    null;

                if (typeof handle === "string") {
                    await revalidate(`product:${handle}`);
                }
                // Depending on your taxonomy, you might also revalidate collection tags.
                // For simplicity we skip due to missing mapping in webhook payload.

                try {
                    const coll = await webhookLogs();
                    await coll.insertOne({
                        topic: "products/update",
                        status: "ok",
                        payload: { revalidatedProduct: handle ?? null },
                        error: null,
                        createdAt: new Date(),
                    });
                } catch {
                    // ignore
                }
                break;
            }

            case "app/uninstalled": {
                try {
                    const coll = await webhookLogs();
                    await coll.insertOne({
                        topic: "app/uninstalled",
                        status: "ok",
                        payload,
                        error: null,
                        createdAt: new Date(),
                    });
                } catch {
                    // ignore
                }
                break;
            }

            default: {
                // Unknown topic: acknowledge
                break;
            }
        }

        return new NextResponse(null, { status: 200 });
    } catch (err: any) {
        try {
            const coll = await webhookLogs();
            await coll.insertOne({
                topic: topic as any,
                status: "error",
                payload,
                error: String(err?.message ?? err),
                createdAt: new Date(),
            });
        } catch {
            // ignore
        }
        return NextResponse.json(
            { error: "Handler error", message: String(err?.message ?? err) },
            { status: 500 }
        );
    }
}
