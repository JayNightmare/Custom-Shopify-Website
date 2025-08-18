/**
 * Storefront GraphQL operations used by the app.
 * These are strings only; use with graphqlStorefront<T> from ./storefront
 */

/* Site metafields (announcement, tip jar) */
export const QUERY_GET_SITE_METAFIELDS = /* GraphQL */ `
    query GetSiteMetafields {
        shop {
            metafields(
                identifiers: [
                    { namespace: "site", key: "announcement_text" }
                    { namespace: "site", key: "announcement_enabled" }
                    { namespace: "site", key: "tipjar_enabled" }
                    { namespace: "site", key: "tipjar_suggestions" }
                ]
            ) {
                key
                value
                type
                namespace
            }
        }
    }
`;

/* Album drop metaobject by handle (Storefront) */
export const QUERY_GET_ALBUM_DROP = /* GraphQL */ `
    query GetAlbumDrop($handle: String!) {
        metaobject(handle: { handle: $handle, type: "album_drop" }) {
            id
            handle
            type
            fields {
                key
                value
                type
            }
        }
    }
`;

/* Collections (basic listing) */
export const QUERY_GET_COLLECTIONS = /* GraphQL */ `
    query GetCollections($first: Int = 10) {
        collections(first: $first) {
            edges {
                node {
                    id
                    handle
                    title
                    description
                }
            }
        }
    }
`;

/* Collection by handle with products (simple filters handled client-side for MVP) */
export const QUERY_GET_COLLECTION_BY_HANDLE = /* GraphQL */ `
    query GetCollectionByHandle($handle: String!, $first: Int = 20) {
        collection(handle: $handle) {
            id
            handle
            title
            description
            products(first: $first) {
                edges {
                    node {
                        id
                        handle
                        title
                        availableForSale
                        featuredImage {
                            altText
                            url
                            width
                            height
                        }
                        priceRange {
                            minVariantPrice {
                                amount
                                currencyCode
                            }
                            maxVariantPrice {
                                amount
                                currencyCode
                            }
                        }
                    }
                }
            }
        }
    }
`;

/* Product by handle */
export const QUERY_GET_PRODUCT_BY_HANDLE = /* GraphQL */ `
    query GetProductByHandle($handle: String!) {
        product(handle: $handle) {
            id
            handle
            title
            description
            availableForSale
            totalInventory
            requiresSellingPlan
            featuredImage {
                altText
                url
                width
                height
            }
            options {
                id
                name
                values
            }
            variants(first: 50) {
                edges {
                    node {
                        id
                        title
                        availableForSale
                        selectedOptions {
                            name
                            value
                        }
                        price {
                            amount
                            currencyCode
                        }
                        compareAtPrice {
                            amount
                            currencyCode
                        }
                    }
                }
            }
            metafields(
                identifiers: [
                    { namespace: "product", key: "badges" }
                    { namespace: "product", key: "preorder_note" }
                ]
            ) {
                key
                value
                type
            }
        }
    }
`;

/* Cart operations */
export const MUTATION_CART_CREATE = /* GraphQL */ `
    mutation CartCreate(
        $lines: [CartLineInput!]
        $attributes: [AttributeInput!]
    ) {
        cartCreate(input: { lines: $lines, attributes: $attributes }) {
            cart {
                id
                checkoutUrl
                totalQuantity
                lines(first: 50) {
                    edges {
                        node {
                            id
                            quantity
                            merchandise {
                                ... on ProductVariant {
                                    id
                                    title
                                    availableForSale
                                    product {
                                        handle
                                        title
                                    }
                                    price {
                                        amount
                                        currencyCode
                                    }
                                }
                            }
                        }
                    }
                }
                cost {
                    subtotalAmount {
                        amount
                        currencyCode
                    }
                    totalAmount {
                        amount
                        currencyCode
                    }
                }
            }
            userErrors {
                field
                message
            }
        }
    }
`;

export const MUTATION_CART_LINES_ADD = /* GraphQL */ `
    mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
        cartLinesAdd(cartId: $cartId, lines: $lines) {
            cart {
                id
                checkoutUrl
                totalQuantity
                lines(first: 50) {
                    edges {
                        node {
                            id
                            quantity
                            merchandise {
                                ... on ProductVariant {
                                    id
                                    title
                                    product {
                                        handle
                                        title
                                    }
                                    price {
                                        amount
                                        currencyCode
                                    }
                                }
                            }
                        }
                    }
                }
            }
            userErrors {
                field
                message
            }
        }
    }
`;

export const MUTATION_CART_LINES_UPDATE = /* GraphQL */ `
    mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
        cartLinesUpdate(cartId: $cartId, lines: $lines) {
            cart {
                id
                checkoutUrl
                totalQuantity
                lines(first: 50) {
                    edges {
                        node {
                            id
                            quantity
                            merchandise {
                                ... on ProductVariant {
                                    id
                                    title
                                    product {
                                        handle
                                        title
                                    }
                                    price {
                                        amount
                                        currencyCode
                                    }
                                }
                            }
                        }
                    }
                }
            }
            userErrors {
                field
                message
            }
        }
    }
`;

export const MUTATION_CART_LINES_REMOVE = /* GraphQL */ `
    mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
        cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
            cart {
                id
                checkoutUrl
                totalQuantity
                lines(first: 50) {
                    edges {
                        node {
                            id
                            quantity
                            merchandise {
                                ... on ProductVariant {
                                    id
                                    title
                                    product {
                                        handle
                                        title
                                    }
                                    price {
                                        amount
                                        currencyCode
                                    }
                                }
                            }
                        }
                    }
                }
            }
            userErrors {
                field
                message
            }
        }
    }
`;

export const QUERY_GET_CART = /* GraphQL */ `
    query GetCart($id: ID!) {
        cart(id: $id) {
            id
            checkoutUrl
            totalQuantity
            lines(first: 50) {
                edges {
                    node {
                        id
                        quantity
                        merchandise {
                            ... on ProductVariant {
                                id
                                title
                                product {
                                    handle
                                    title
                                }
                                price {
                                    amount
                                    currencyCode
                                }
                            }
                        }
                    }
                }
            }
            cost {
                subtotalAmount {
                    amount
                    currencyCode
                }
                totalAmount {
                    amount
                    currencyCode
                }
            }
        }
    }
`;
