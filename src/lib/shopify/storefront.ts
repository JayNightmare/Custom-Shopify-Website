/**
 * Shopify Storefront GraphQL fetcher with:
 * - Typed generic response
 * - Exponential backoff retry on 429/errors
 * - Next.js caching helpers (revalidate, tags)
 * - Mock fallback when env is missing (for local dev/tests)
 */

type FetchInit = {
    revalidate?: number;
    cacheTags?: string[];
    /**
     * Whether to bypass cache (useful for SSR no-cache fetches)
     */
    cache?: RequestCache;
};

export type GraphQLResult<T> = {
    data?: T;
    errors?: Array<{ message: string; extensions?: Record<string, any> }>;
    extensions?: {
        cost?: {
            throttleStatus?: {
                currentlyAvailable?: number;
                maximumAvailable?: number;
                restoreRate?: number;
            };
            requestedQueryCost?: number;
            actualQueryCost?: number;
        };
    };
};

const DEFAULT_REVALIDATE = 60;
const MAX_RETRIES = 3;

const env = {
    domain: process.env.SHOPIFY_STORE_DOMAIN,
    apiVersion: process.env.SHOPIFY_STOREFRONT_API_VERSION ?? "2024-04",
    token: process.env.SHOPIFY_STOREFRONT_TOKEN,
};

export const isShopifyMock = !env.domain || !env.token;

function shopifyEndpoint(): string {
    if (!env.domain) throw new Error("SHOPIFY_STORE_DOMAIN is not set");
    if (!env.apiVersion)
        throw new Error("SHOPIFY_STOREFRONT_API_VERSION is not set");
    return `https://${env.domain}/api/${env.apiVersion}/graphql.json`;
}

function headers(): HeadersInit {
    if (!env.token) throw new Error("SHOPIFY_STOREFRONT_TOKEN is not set");
    return {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": env.token!,
    };
}

function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
}

function shouldRetry<T>(res: Response, body?: GraphQLResult<T>): boolean {
    if (res.status === 429 || res.status === 503) return true;
    if (!body) return false;
    // Retry on throttle or transient network errors indicated by Shopify
    const throttled =
        body.errors?.some(
            (e) =>
                e.message?.toLowerCase().includes("throttle") ||
                e.extensions?.code === "THROTTLED"
        ) ?? false;
    return throttled;
}

/**
 * Generic typed Storefront GraphQL fetcher.
 */
export async function graphqlStorefront<T>(
    query: string,
    variables?: Record<string, any>,
    init?: FetchInit
): Promise<T> {
    if (isShopifyMock) {
        return mockStorefront<T>(query, variables);
    }

    const url = shopifyEndpoint();
    const revalidate = init?.revalidate ?? DEFAULT_REVALIDATE;
    const tags = init?.cacheTags ?? [];
    const cache = init?.cache;

    let attempt = 0;
    let lastError: any;

    while (attempt < MAX_RETRIES) {
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: headers(),
                body: JSON.stringify({ query, variables }),
                // Next.js caching
                next: { revalidate, tags },
                cache,
            });

            let json: GraphQLResult<T> | undefined;
            try {
                json = (await res.json()) as GraphQLResult<T>;
            } catch {
                // Non-JSON response
            }

            if (!res.ok) {
                if (shouldRetry(res, json)) {
                    attempt++;
                    await sleep(500 * Math.pow(2, attempt));
                    continue;
                }
                const msg =
                    json?.errors?.map((e) => e.message).join("; ") ||
                    `Storefront HTTP ${res.status}`;
                throw new Error(msg);
            }

            if (json?.errors?.length) {
                // Retry on throttle/transient errors
                if (shouldRetry(res, json)) {
                    attempt++;
                    await sleep(500 * Math.pow(2, attempt));
                    continue;
                }
                throw new Error(json.errors.map((e) => e.message).join("; "));
            }

            if (!json?.data) {
                throw new Error("Storefront response missing data");
            }

            // Respect cost.throttleStatus heuristics (best-effort sleep if nearly depleted)
            const avail =
                json.extensions?.cost?.throttleStatus?.currentlyAvailable ?? 1;
            const restore =
                json.extensions?.cost?.throttleStatus?.restoreRate ?? 0;
            if (avail <= 1 && restore > 0) {
                // light pause to avoid immediate throttle on next call
                await sleep(100);
            }

            return json.data as T;
        } catch (err) {
            lastError = err;
            attempt++;
            if (attempt < MAX_RETRIES) {
                await sleep(500 * Math.pow(2, attempt));
            }
        }
    }

    throw new Error(
        `Storefront request failed after ${MAX_RETRIES} attempts: ${String(lastError)}`
    );
}

/**
 * Helpers for common caching patterns
 */
export const cacheTags = {
    product: (handle: string) => `product:${handle}`,
    collection: (handle: string) => `collection:${handle}`,
    cart: (id: string) => `cart:${id}`,
};

/**
 * Minimal mock layer to enable local dev and tests without env vars.
 * This returns deterministic shapes for key queries used by the app.
 */
function mockStorefront<T>(query: string, variables?: Record<string, any>): T {
    const q = query.toLowerCase();

    if (q.includes("cartcreate")) {
        return {
            cartCreate: {
                cart: {
                    id: "mock-cart-id",
                    checkoutUrl: "https://mock-checkout/cart",
                    totalQuantity: 0,
                    lines: { edges: [] },
                },
                userErrors: [],
            },
        } as unknown as T;
    }

    if (q.includes("cartlinesadd")) {
        const quantity = variables?.lines?.[0]?.quantity ?? 1;
        return {
            cartLinesAdd: {
                cart: {
                    id: variables?.cartId ?? "mock-cart-id",
                    checkoutUrl: "https://mock-checkout/cart",
                    totalQuantity: quantity,
                    lines: {
                        edges: [
                            {
                                node: {
                                    id: "mock-line-id",
                                    quantity,
                                    merchandise: {
                                        id: "gid://shopify/ProductVariant/1",
                                        title: "Mock Variant",
                                        product: {
                                            handle: "mock-product",
                                            title: "Mock Product",
                                        },
                                    },
                                },
                            },
                        ],
                    },
                },
                userErrors: [],
            },
        } as unknown as T;
    }

    if (q.includes("cartlinesupdate")) {
        return {
            cartLinesUpdate: {
                cart: {
                    id: variables?.cartId ?? "mock-cart-id",
                    checkoutUrl: "https://mock-checkout/cart",
                    totalQuantity: 2,
                    lines: { edges: [] },
                },
                userErrors: [],
            },
        } as unknown as T;
    }

    if (q.includes("cartlinesremove")) {
        return {
            cartLinesRemove: {
                cart: {
                    id: variables?.cartId ?? "mock-cart-id",
                    checkoutUrl: "https://mock-checkout/cart",
                    totalQuantity: 0,
                    lines: { edges: [] },
                },
                userErrors: [],
            },
        } as unknown as T;
    }

    if (q.includes("cart") && q.includes("id:")) {
        const id = variables?.id ?? "mock-cart-id";
        return {
            cart: {
                id,
                checkoutUrl: "https://mock-checkout/cart",
                totalQuantity: 1,
                lines: {
                    edges: [
                        {
                            node: {
                                id: "mock-line-id",
                                quantity: 1,
                                merchandise: {
                                    id: "gid://shopify/ProductVariant/1",
                                    title: "Mock Variant",
                                    product: {
                                        handle: "mock-product",
                                        title: "Mock Product",
                                    },
                                },
                            },
                        },
                    ],
                },
                cost: {
                    subtotalAmount: { amount: "25.00", currencyCode: "USD" },
                    totalAmount: { amount: "25.00", currencyCode: "USD" },
                },
            },
        } as unknown as T;
    }

    if (q.includes("product") && q.includes("byhandle")) {
        const handle = variables?.handle ?? "mock-product";
        return {
            productByHandle: {
                handle,
                title: "Mock Product",
                description: "Mock product description",
                availableForSale: true,
                requiresSellingPlan: false,
                variants: {
                    edges: [
                        {
                            node: {
                                id: "gid://shopify/ProductVariant/1",
                                title: "Default",
                                availableForSale: true,
                                price: { amount: "25.00", currencyCode: "USD" },
                            },
                        },
                    ],
                },
                metafields: [
                    {
                        key: "badges",
                        type: "list.single_line_text_field",
                        value: JSON.stringify(["Limited"]),
                    },
                    {
                        key: "preorder_note",
                        type: "multi_line_text_field",
                        value: "Preorder ships in 4 weeks.",
                    },
                ],
            },
        } as unknown as T;
    }

    if (q.includes("collections") || q.includes("collectionbyhandle")) {
        const handle = variables?.handle ?? "all";
        return {
            collections: {
                edges: [
                    {
                        node: {
                            handle,
                            title: "All",
                            products: {
                                edges: [
                                    {
                                        node: {
                                            handle: "mock-product",
                                            title: "Mock Product",
                                            availableForSale: true,
                                            variants: {
                                                edges: [
                                                    {
                                                        node: {
                                                            id: "gid://shopify/ProductVariant/1",
                                                            title: "Default",
                                                            availableForSale: true,
                                                            price: {
                                                                amount: "25.00",
                                                                currencyCode:
                                                                    "USD",
                                                            },
                                                        },
                                                    },
                                                ],
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                    },
                ],
            },
        } as unknown as T;
    }

    if (q.includes("metaobject") || q.includes("album_drop")) {
        return {
            metaobject: {
                handle: "album_drop",
                fields: [
                    { key: "title", value: "Mock Album" },
                    {
                        key: "release_at",
                        value: new Date(
                            Date.now() + 7 * 86400000
                        ).toISOString(),
                    },
                    { key: "hero_image", value: "mock-file-id" },
                    {
                        key: "streaming_links",
                        value: JSON.stringify(["https://spotify.com/mock"]),
                    },
                    { key: "cta_text", value: "Shop the Drop" },
                    { key: "collection_handle", value: "all" },
                    { key: "badge_text", value: "New" },
                ],
            },
        } as unknown as T;
    }

    if (q.includes("metafields") && q.includes("site")) {
        return {
            shop: {
                metafields: [
                    {
                        key: "announcement_text",
                        value: "Free shipping on orders over $50",
                    },
                    { key: "announcement_enabled", value: "true" },
                    { key: "tipjar_enabled", value: "true" },
                    {
                        key: "tipjar_suggestions",
                        value: JSON.stringify([200, 500, 1000]),
                    },
                ],
            },
        } as unknown as T;
    }

    // Default empty
    return {} as unknown as T;
}
