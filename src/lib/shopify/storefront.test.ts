import { describe, it, expect, beforeEach, vi } from "vitest";
import { graphqlStorefront, isShopifyMock, cacheTags } from "./storefront";

// Helper to unset env for mock mode
const resetEnv = () => {
    delete (process.env as any).SHOPIFY_STORE_DOMAIN;
    delete (process.env as any).SHOPIFY_STOREFRONT_TOKEN;
    // Keep API version default
};

describe("Shopify Storefront fetcher (mock mode)", () => {
    beforeEach(() => {
        resetEnv();
    });

    it("is in mock mode when env is missing", () => {
        expect(isShopifyMock).toBe(true);
    });

    it("cartCreate returns a mock cart", async () => {
        const query = `
      mutation CartCreate($lines: [CartLineInput!]) {
        cartCreate(input: { lines: $lines }) {
          cart { id checkoutUrl totalQuantity lines { edges { node { id } } } }
          userErrors { message }
        }
      }
    `;
        const data = await graphqlStorefront<any>(query, { lines: [] });
        expect(data.cartCreate.cart.id).toBe("mock-cart-id");
        expect(data.cartCreate.cart.checkoutUrl).toContain("mock-checkout");
        expect(data.cartCreate.userErrors).toEqual([]);
    });

    it("cartLinesAdd returns quantity and a line", async () => {
        const query = `
      mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
        cartLinesAdd(cartId: $cartId, lines: $lines) {
          cart {
            id
            totalQuantity
            lines { edges { node { id quantity merchandise { ... on ProductVariant { id title product { handle title } } } } } }
          }
          userErrors { message }
        }
      }
    `;
        const data = await graphqlStorefront<any>(query, {
            cartId: "mock-cart-id",
            lines: [
                {
                    quantity: 3,
                    merchandiseId: "gid://shopify/ProductVariant/1",
                },
            ],
        });
        expect(data.cartLinesAdd.cart.id).toBe("mock-cart-id");
        expect(data.cartLinesAdd.cart.totalQuantity).toBe(3);
        expect(data.cartLinesAdd.cart.lines.edges[0].node.quantity).toBe(3);
    });

    it("GetCart by ID returns a mock cart", async () => {
        const query = `
      query GetCart($id: ID!) {
        cart(id: $id) {
          id
          checkoutUrl
          totalQuantity
          lines { edges { node { id quantity } } }
          cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }
        }
      }
    `;
        const data = await graphqlStorefront<any>(query, {
            id: "mock-cart-id",
        });
        expect(data.cart.id).toBe("mock-cart-id");
        expect(data.cart.totalQuantity).toBeGreaterThanOrEqual(0);
        expect(data.cart.cost.subtotalAmount.amount).toBeDefined();
    });

    it("productByHandle returns a mock product with metafields", async () => {
        const query = `
      query GetProductByHandle($handle: String!) {
        productByHandle: product(handle: $handle) {
          handle
          title
          availableForSale
          variants(first: 1) { edges { node { id title availableForSale price { amount currencyCode } } } }
          metafields(identifiers: [
            { namespace: "product", key: "badges" },
            { namespace: "product", key: "preorder_note" }
          ]) {
            key
            value
            type
          }
        }
      }
    `;
        const data = await graphqlStorefront<any>(query, {
            handle: "mock-product",
        });
        expect(data.productByHandle.handle).toBe("mock-product");
        const badges = data.productByHandle.metafields.find(
            (m: any) => m.key === "badges"
        );
        expect(badges).toBeDefined();
    });

    it("album_drop metaobject returns mock fields", async () => {
        const query = `
      query GetAlbumDrop($handle: String!) {
        metaobject(handle: { handle: $handle, type: "album_drop" }) {
          handle
          fields { key value }
        }
      }
    `;
        const data = await graphqlStorefront<any>(query, {
            handle: "album_drop",
        });
        expect(data.metaobject.handle).toBe("album_drop");
        const titleField = data.metaobject.fields.find(
            (f: any) => f.key === "title"
        );
        expect(titleField.value).toBe("Mock Album");
    });

    it("site metafields return announcement and tipjar settings", async () => {
        const query = `
      query GetSiteMetafields {
        shop {
          metafields(identifiers: [
            { namespace: "site", key: "announcement_text" },
            { namespace: "site", key: "announcement_enabled" },
            { namespace: "site", key: "tipjar_enabled" },
            { namespace: "site", key: "tipjar_suggestions" }
          ]) {
            key
            value
          }
        }
      }
    `;
        const data = await graphqlStorefront<any>(query);
        const keys = data.shop.metafields.map((m: any) => m.key);
        expect(keys).toContain("announcement_text");
        expect(keys).toContain("tipjar_suggestions");
    });

    it("cacheTags helper formats tags correctly", () => {
        expect(cacheTags.product("tee")).toBe("product:tee");
        expect(cacheTags.collection("all")).toBe("collection:all");
        expect(cacheTags.cart("abc")).toBe("cart:abc");
    });
});
