import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { graphqlAdmin } from "./admin";

const ORIGINAL_ENV = { ...process.env };

describe.sequential("graphqlAdmin - mock mode (no env)", () => {
    beforeEach(() => {
        delete (process.env as any).SHOPIFY_STORE_DOMAIN;
        delete (process.env as any).SHOPIFY_ADMIN_TOKEN;
        delete (process.env as any).SHOPIFY_ADMIN_API_VERSION;
    });

    afterEach(() => {
        const keys = [
            "SHOPIFY_STORE_DOMAIN",
            "SHOPIFY_ADMIN_TOKEN",
            "SHOPIFY_ADMIN_API_VERSION",
        ];
        for (const k of keys) {
            const v = (ORIGINAL_ENV as any)[k];
            if (v !== undefined) (process.env as any)[k] = v;
            else delete (process.env as any)[k];
        }
        vi.restoreAllMocks();
        vi.unstubAllGlobals?.();
    });

    it("returns mocked metafieldsSet response", async () => {
        const query = /* GraphQL */ `
            mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
                metafieldsSet(metafields: $metafields) {
                    metafields {
                        id
                        namespace
                        key
                        value
                        type
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;
        const res = await graphqlAdmin<any>(query, {
            metafields: [
                {
                    namespace: "site",
                    key: "announcement_text",
                    value: "hello",
                    type: "single_line_text_field",
                },
            ],
        });
        expect(res.metafieldsSet).toBeDefined();
        expect(res.metafieldsSet.metafields[0]).toMatchObject({
            namespace: "site",
            key: "announcement_text",
            value: "hello",
        });
    });

    it("returns mocked metaobjectUpsert response", async () => {
        const query = /* GraphQL */ `
            mutation UpsertDrop(
                $handle: String!
                $type: String!
                $fields: [MetaobjectFieldInput!]!
            ) {
                metaobjectUpsert(
                    handle: { handle: $handle, type: $type }
                    metaobject: { fields: $fields }
                ) {
                    metaobject {
                        id
                        handle
                        type
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;
        const res = await graphqlAdmin<any>(query, {
            handle: "album_drop",
            type: "album_drop",
            fields: [{ key: "title", value: "New Album" }],
        });
        expect(res.metaobjectUpsert.metaobject).toMatchObject({
            handle: "album_drop",
            type: "album_drop",
        });
    });

    it("returns mocked stagedUploadsCreate response", async () => {
        const query = /* GraphQL */ `
            mutation StagedUploads($input: [StagedUploadInput!]!) {
                stagedUploadsCreate(input: $input) {
                    stagedTargets {
                        url
                        resourceUrl
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;
        const res = await graphqlAdmin<any>(query, {
            input: [
                {
                    filename: "hero.png",
                    mimeType: "image/png",
                    httpMethod: "POST",
                    resource: "FILE",
                },
            ],
        });
        expect(res.stagedUploadsCreate.stagedTargets[0]).toHaveProperty("url");
    });
});

describe.sequential("graphqlAdmin - retry/backoff behavior (env set)", () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        (process.env as any).SHOPIFY_STORE_DOMAIN = "example.myshopify.com";
        (process.env as any).SHOPIFY_ADMIN_TOKEN = "shpat_test";
        (process.env as any).SHOPIFY_ADMIN_API_VERSION = "2024-04";
        vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
    });

    afterEach(() => {
        const keys = [
            "SHOPIFY_STORE_DOMAIN",
            "SHOPIFY_ADMIN_TOKEN",
            "SHOPIFY_ADMIN_API_VERSION",
        ];
        for (const k of keys) {
            const v = (ORIGINAL_ENV as any)[k];
            if (v !== undefined) (process.env as any)[k] = v;
            else delete (process.env as any)[k];
        }
        vi.restoreAllMocks();
        vi.unstubAllGlobals?.();
    });

    it("retries on 429 then succeeds", async () => {
        const bad = new Response(JSON.stringify({ errors: [] }), {
            status: 429,
            headers: { "content-type": "application/json" },
        });
        const goodPayload = { data: { shop: { name: "Test Shop" } } };
        const good = new Response(JSON.stringify(goodPayload), {
            status: 200,
            headers: { "content-type": "application/json" },
        });

        fetchMock.mockResolvedValueOnce(bad).mockResolvedValueOnce(good);

        const data = await graphqlAdmin<{ shop: { name: string } }>(
            "query { shop { name } }"
        );
        expect(data.shop.name).toBe("Test Shop");
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls[0][0]).toContain(
            "https://example.myshopify.com/admin/api/2024-04/graphql.json"
        );
    });

    it("propagates errors after max retries", async () => {
        const always429 = new Response(JSON.stringify({ errors: [] }), {
            status: 429,
            headers: { "content-type": "application/json" },
        });
        fetchMock.mockResolvedValue(always429);

        await expect(
            graphqlAdmin<any>("query { shop { name } }")
        ).rejects.toThrow(/failed after/i);
        expect(fetchMock).toHaveBeenCalled();
    }, 15000);
});
