/**
 * Shopify Admin GraphQL fetcher (server-only, Node runtime).
 * - Never expose Admin token client-side.
 * - Retries with backoff on 429/503 or throttled responses.
 * - Mock fallback when env vars are missing to enable local dev/tests.
 */

type FetchInit = {
    revalidate?: number; // not used for Admin, but kept for parity
};

export type AdminGraphQLResult<T> = {
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

const MAX_RETRIES = 3;

function getEnv() {
    return {
        domain: process.env.SHOPIFY_STORE_DOMAIN,
        apiVersion: process.env.SHOPIFY_ADMIN_API_VERSION ?? "2024-04",
        token: process.env.SHOPIFY_ADMIN_TOKEN,
    };
}

export function isAdminMock(): boolean {
    const env = getEnv();
    return !env.domain || !env.token;
}

function adminEndpoint(): string {
    const env = getEnv();
    if (!env.domain) throw new Error("SHOPIFY_STORE_DOMAIN is not set");
    if (!env.apiVersion)
        throw new Error("SHOPIFY_ADMIN_API_VERSION is not set");
    return `https://${env.domain}/admin/api/${env.apiVersion}/graphql.json`;
}

function headers(): HeadersInit {
    const env = getEnv();
    if (!env.token) throw new Error("SHOPIFY_ADMIN_TOKEN is not set");
    return {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": env.token!,
    };
}

function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
}

function shouldRetry<T>(res: Response, body?: AdminGraphQLResult<T>): boolean {
    if (res.status === 429 || res.status === 503) return true;
    if (!body) return false;
    const throttled =
        body.errors?.some(
            (e) =>
                e.message?.toLowerCase().includes("throttle") ||
                e.extensions?.code === "THROTTLED"
        ) ?? false;
    return throttled;
}

/**
 * Generic Admin GraphQL fetcher. Use on Node runtime only.
 */
export async function graphqlAdmin<T>(
    query: string,
    variables?: Record<string, any>,
    _init?: FetchInit
): Promise<T> {
    if (isAdminMock()) {
        return mockAdmin<T>(query, variables);
    }

    const url = adminEndpoint();

    let attempt = 0;
    let lastError: any;

    while (attempt < MAX_RETRIES) {
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: headers(),
                body: JSON.stringify({ query, variables }),
                // Explicitly force Node runtime semantics
                cache: "no-store",
            });

            let json: AdminGraphQLResult<T> | undefined;
            try {
                json = (await res.json()) as AdminGraphQLResult<T>;
            } catch {
                // ignore
            }

            if (!res.ok) {
                if (shouldRetry(res, json)) {
                    attempt++;
                    await sleep(500 * Math.pow(2, attempt));
                    continue;
                }
                const msg =
                    json?.errors?.map((e) => e.message).join("; ") ||
                    `Admin HTTP ${res.status}`;
                throw new Error(msg);
            }

            if (json?.errors?.length) {
                if (shouldRetry(res, json)) {
                    attempt++;
                    await sleep(500 * Math.pow(2, attempt));
                    continue;
                }
                throw new Error(json.errors.map((e) => e.message).join("; "));
            }

            if (!json?.data) {
                throw new Error("Admin response missing data");
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
        `Admin request failed after ${MAX_RETRIES} attempts: ${String(lastError)}`
    );
}

/**
 * Minimal mock for Admin ops so local dev works without tokens.
 */
function mockAdmin<T>(query: string, variables?: Record<string, any>): T {
    const q = query.toLowerCase();

    if (q.includes("metafieldsset")) {
        return {
            metafieldsSet: {
                metafields: (variables?.metafields ?? []).map(
                    (m: any, i: number) => ({
                        id: `gid://shopify/Metafield/${i + 1}`,
                        namespace: m.namespace,
                        key: m.key,
                        value: m.value,
                        type: m.type ?? "single_line_text_field",
                    })
                ),
                userErrors: [],
            },
        } as unknown as T;
    }

    if (q.includes("metaobjectupsert")) {
        return {
            metaobjectUpsert: {
                metaobject: {
                    id: "gid://shopify/Metaobject/1",
                    handle: variables?.handle ?? "album_drop",
                    type: variables?.type ?? "album_drop",
                    fields: variables?.fields ?? [],
                },
                userErrors: [],
            },
        } as unknown as T;
    }

    if (q.includes("stageduploadscreate")) {
        return {
            stagedUploadsCreate: {
                stagedTargets: [
                    {
                        url: "https://mock-upload",
                        resourceUrl: "gid://shopify/File/1",
                        parameters: [],
                    },
                ],
                userErrors: [],
            },
        } as unknown as T;
    }

    // default OK
    return {} as unknown as T;
}
