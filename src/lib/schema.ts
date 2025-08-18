import { z } from "zod";

/* -------------------------
 * Cart schemas (Storefront)
 * ------------------------- */
export const AttributeSchema = z.object({
    key: z.string().min(1),
    value: z.string().default(""),
});

export const CartLineInputSchema = z.object({
    merchandiseId: z.string().min(1),
    quantity: z.number().int().min(1),
    attributes: z.array(AttributeSchema).optional(),
});

export const CartCreateBodySchema = z.object({
    lines: z.array(CartLineInputSchema).optional(),
    attributes: z.array(AttributeSchema).optional(),
});

export const CartLineUpdateSchema = z.object({
    id: z.string().min(1),
    quantity: z.number().int().min(0),
});

export const CartLinesAddBodySchema = z.object({
    cartId: z.string().min(1),
    lines: z.array(CartLineInputSchema).min(1),
});

export const CartLinesUpdateBodySchema = z.object({
    cartId: z.string().min(1),
    lines: z.array(CartLineUpdateSchema).min(1),
});

export const CartLinesRemoveBodySchema = z.object({
    cartId: z.string().min(1),
    lineIds: z.array(z.string().min(1)).min(1),
});

/* -------------------------
 * Console draft schemas (Mongo)
 * ------------------------- */
export const ConsoleDraftSchema = z.object({
    key: z.string().min(1),
    data: z.record(z.string(), z.any()),
    version: z.number().int().nonnegative().default(0),
    updatedBy: z.string().min(1),
    updatedAt: z.preprocess(
        (v) => (v === undefined ? new Date() : v),
        z.date()
    ),
    publishedAt: z.date().nullable().default(null),
});
export type ConsoleDraft = z.infer<typeof ConsoleDraftSchema>;

export const FeatureFlagSchema = z.object({
    key: z.string().min(1),
    enabled: z.boolean(),
    description: z.string().default(""),
    updatedAt: z.preprocess(
        (v) => (v === undefined ? new Date() : v),
        z.date()
    ),
});
export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;

export const WebhookLogSchema = z.object({
    topic: z.enum(["orders/create", "products/update", "app/uninstalled"]),
    status: z.enum(["ok", "error"]),
    payload: z.record(z.string(), z.any()),
    error: z.string().nullable().default(null),
    createdAt: z.preprocess(
        (v) => (v === undefined ? new Date() : v),
        z.date()
    ),
});
export type WebhookLog = z.infer<typeof WebhookLogSchema>;

/* -------------------------
 * Webhook validation helpers
 * ------------------------- */
export const ShopifyWebhookHeadersSchema = z.object({
    "x-shopify-topic": z.string(),
    "x-shopify-hmac-sha256": z.string(),
    "x-shopify-shop-domain": z.string(),
});
export type ShopifyWebhookHeaders = z.infer<typeof ShopifyWebhookHeadersSchema>;

/* -------------------------
 * Helper: safe parse JSON body
 * ------------------------- */
export async function parseJsonBody<T>(req: Request): Promise<unknown> {
    const text = await req.text();
    if (!text) return {};
    try {
        return JSON.parse(text) as T;
    } catch {
        return {};
    }
}

/**
 * Strict JSON body parser that indicates parse validity.
 * Returns { ok: boolean, data: unknown } where ok=false when JSON is malformed.
 */
export async function parseJsonBodyStrict<T>(
    req: Request
): Promise<{ ok: boolean; data: unknown }> {
    const text = await req.text();
    if (!text) return { ok: true, data: {} };
    try {
        return { ok: true, data: JSON.parse(text) as T };
    } catch {
        return { ok: false, data: {} };
    }
}
