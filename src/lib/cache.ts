"use server";

import { revalidateTag } from "next/cache";

/**
 * Cache tag helpers, mirroring the tags used in fetch next: { tags: [] }.
 */
export const tags = {
    product: (handle: string) => `product:${handle}`,
    collection: (handle: string) => `collection:${handle}`,
    cart: (id: string) => `cart:${id}`,
};

/**
 * Revalidate a specific tag, swallowing errors in non-production to avoid dev crashes.
 */
export async function revalidate(tag: string) {
    try {
        revalidateTag(tag);
    } catch (err) {
        if (process.env.NODE_ENV === "production") {
            throw err;
        }
        // eslint-disable-next-line no-console
        console.warn("[cache.revalidate] non-fatal:", err);
    }
}
