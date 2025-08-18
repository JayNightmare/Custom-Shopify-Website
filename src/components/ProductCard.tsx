import Link from "next/link";
import Image from "next/image";
import Price from "./Price";

export type ProductCardProps = {
  product: {
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
  };
  className?: string;
};

export default function ProductCard({ product, className }: ProductCardProps) {
  const img = product.featuredImage;
  const min = product.priceRange?.minVariantPrice;
  const max = product.priceRange?.maxVariantPrice;
  const samePrice =
    !!min &&
    !!max &&
    min.amount === max.amount &&
    min.currencyCode === max.currencyCode;

  return (
    <Link
      href={`/product/${product.handle}`}
      className={`group block rounded-lg border border-black/10 dark:border-white/15 overflow-hidden hover:shadow-sm transition ${className ?? ""}`}
    >
      <div className="aspect-square bg-black/[.03] dark:bg-white/[.06] relative">
        {img?.url ? (
          <Image
            src={img.url}
            alt={img.altText ?? product.title}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            sizes="(min-width: 768px) 25vw, 50vw"
            priority={false}
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-sm text-neutral-500">
            No image
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium line-clamp-2">{product.title}</h3>
        <div className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
          {min ? (
            samePrice ? (
              <Price amount={min.amount} currencyCode={min.currencyCode} />
            ) : (
              <>
                <span className="text-neutral-500 mr-1">From</span>
                <Price amount={min.amount} currencyCode={min.currencyCode} />
              </>
            )
          ) : (
            <span className="text-neutral-500">—</span>
          )}
        </div>
      </div>
    </Link>
  );
}
