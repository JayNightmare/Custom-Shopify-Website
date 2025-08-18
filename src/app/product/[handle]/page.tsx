import Image from "next/image";
import { notFound } from "next/navigation";
import VariantSelector, { type Variant } from "@/components/VariantSelector";
import Price from "@/components/Price";
import { graphqlStorefront, cacheTags } from "@/lib/shopify/storefront";

type ProductVariantNode = {
  id: string;
  title: string;
  availableForSale: boolean;
  price?: { amount: string; currencyCode: string };
};

type ProductNode = {
  id: string;
  handle: string;
  title: string;
  description?: string | null;
  availableForSale: boolean;
  requiresSellingPlan?: boolean;
  featuredImage?: {
    altText?: string | null;
    url: string;
    width?: number | null;
    height?: number | null;
  } | null;
  options?: { id: string; name: string; values: string[] }[];
  variants?: { edges: Array<{ node: ProductVariantNode }> };
};

type ProductQuery = {
  productByHandle?: ProductNode | null;
};

const QUERY_PRODUCT_BY_HANDLE = /* GraphQL */ `
  query GetProductByHandle($handle: String!) {
    productByHandle: product(handle: $handle) {
      id
      handle
      title
      description
      availableForSale
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
            price { amount currencyCode }
          }
        }
      }
    }
  }
`;

type PageProps = {
  params: Promise<{ handle: string }>;
};

export default async function ProductPage({ params }: PageProps) {
  const { handle } = await params;

  const data = await graphqlStorefront<ProductQuery>(
    QUERY_PRODUCT_BY_HANDLE,
    { handle },
    { revalidate: 120, cacheTags: [cacheTags.product(handle)] }
  );

  const product = data?.productByHandle;
  if (!product) {
    notFound();
  }

  const variants: Variant[] =
    product.variants?.edges?.map((e) => ({
      id: e.node.id,
      title: e.node.title,
      availableForSale: e.node.availableForSale,
      price: e.node.price
        ? {
            amount: String(e.node.price.amount),
            currencyCode: e.node.price.currencyCode,
          }
        : undefined,
    })) ?? [];

  const defaultVariantId = variants[0]?.id;
  const displayPrice = variants[0]?.price;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <div className="aspect-square bg-black/[.03] dark:bg-white/[.06] relative rounded-md overflow-hidden">
          {product.featuredImage?.url ? (
            <Image
              src={product.featuredImage.url}
              alt={product.featuredImage.altText ?? product.title}
              fill
              className="object-cover"
              sizes="(min-width: 768px) 50vw, 100vw"
              priority={false}
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-neutral-500">
              No image
            </div>
          )}
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">{product.title}</h1>
        {displayPrice ? (
          <div className="mt-2 text-lg">
            <Price
              amount={displayPrice.amount}
              currencyCode={displayPrice.currencyCode}
            />
          </div>
        ) : null}

        {product.description ? (
          <p className="mt-4 text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-line">
            {product.description}
          </p>
        ) : null}

        <div className="mt-6">
          <VariantSelector
            variants={variants}
            defaultVariantId={defaultVariantId}
          />
        </div>
      </div>
    </div>
  );
}
