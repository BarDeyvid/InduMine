import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Package } from "lucide-react";
import type { Product } from "@/types";

interface RelatedProductsProps {
  products: Product[];
  title?: string;
}

export function RelatedProducts({ products, title = "Produtos Relacionados" }: RelatedProductsProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pb-4">
          {products.map((product) => (
            <Link
              key={product.id}
              to={`/products/${product.id}`}
              className="flex-shrink-0 w-[200px]"
            >
              <Card className="group h-full overflow-hidden transition-all duration-300 hover:shadow-md hover:border-primary/30">
                <div className="aspect-square relative bg-muted/30">
                  {product.photo ? (
                    <img
                      src={product.photo}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`absolute inset-0 flex items-center justify-center ${product.photo ? 'hidden' : ''}`}>
                    <Package className="w-12 h-12 text-muted-foreground/30" />
                  </div>
                </div>
                <CardContent className="p-3">
                  <p className="text-xs font-mono text-muted-foreground mb-1">
                    {product.product_code}
                  </p>
                  <h4 className="text-sm font-medium text-card-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {product.name}
                  </h4>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
