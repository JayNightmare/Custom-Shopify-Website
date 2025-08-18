import ProductCard from "@/components/ProductCard";
import { graphqlStorefront } from "@/lib/shopify/storefront";

type VariantNode = {
  price?: { amount: string; currencyCode: string };
};

type ProductNode = {
  handle: string;
  title: string;
  featuredImage?: {
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
  priceRange?: {
    minVariantPrice: { amount: string; currencyCode: string };
    maxVariantPrice: { amount: string; currencyCode: string };
  };
  variants?: { edges: { node: VariantNode }[] };
};

type HomeQuery = {
  collections: {
    edges: Array<{
      node: {
        handle: string;
        title: string;
        products: { edges: Array<{ node: ProductNode }> };
      };
    }>;
  };
};

const QUERY_HOME_COLLECTIONS = /* GraphQL */ `
  query HomeCollections($first: Int = 20) {
    collections(first: 1) {
      edges {
        node {
          handle
          title
          products(first: $first) {
            edges {
              node {
                handle
                title
                featuredImage { url altText width height }
                priceRange {
                  minVariantPrice { amount currencyCode }
                  maxVariantPrice { amount currencyCode }
                }
                variants(first: 1) { edges { node { price { amount currencyCode } } } }
              }
            }
          }
        }
      }
    }
  }
`;

export default async function Home() {
  const data = await graphqlStorefront<HomeQuery>(QUERY_HOME_COLLECTIONS, { first: 12 }, { revalidate: 60 });
  const collection = data?.collections?.edges?.[0]?.node;
  const productsRaw = collection?.products?.edges?.map((e) => e.node) ?? [];

  const products = productsRaw.map((p) => {
    const firstVariantPrice = p?.variants?.edges?.[0]?.node?.price;
    const priceRange =
      p.priceRange ??
      (firstVariantPrice
        ? {
            minVariantPrice: firstVariantPrice,
            maxVariantPrice: firstVariantPrice,
          }
        : undefined);

    return {
      handle: p.handle,
      title: p.title,
      featuredImage: p.featuredImage ?? null,
      priceRange,
    };
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Featured</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product) => (
          <ProductCard key={product.handle} product={product} />
        ))}
      </div>
      {products.length === 0 && (
        <p className="text-sm text-neutral-500 mt-6">No products found.</p>
      )}
    </div>
  );
}
