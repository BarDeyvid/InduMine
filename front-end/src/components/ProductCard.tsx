import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { SpecBadge } from "@/components/ui/spec-badge";
import { Package } from "lucide-react";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  // Get first 2 specs for badges, filtering out system fields
  const systemFields = [
    'Category_Path',
    'Category_Level_1',
    'Category_Level_2',
    'Category_Level_3',
    'Category_Level_4',
    'Category_Level_5',
    'Product Name',
    'Product Code'
  ];

  const specEntries = Object.entries(product.main_specs || {})
    .filter(([key, value]) => !systemFields.includes(key) && value !== null && value !== '')
    .slice(0, 2);

  return (
    <Link to={`/products/${product.id}`}>
      <Card className="group h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1">
        <div className="aspect-[4/3] relative bg-muted/30 overflow-hidden">
          {product.photo ? (
            <img
              src={product.photo}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`absolute inset-0 flex items-center justify-center ${product.photo ? 'hidden' : ''}`}>
            <Package className="w-16 h-16 text-muted-foreground/30" />
          </div>
          <div className="absolute top-3 right-3">
            <StatusBadge status={product.status} />
          </div>
        </div>
        <CardContent className="p-4">
          <p className="text-xs font-mono text-muted-foreground mb-1">
            {product.product_code}
          </p>
          <h3 className="font-semibold text-card-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          {specEntries.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {specEntries.map(([key, value]) => (
                <SpecBadge key={key} label={key} value={String(value)} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
