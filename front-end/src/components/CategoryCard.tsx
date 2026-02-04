import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Folder, ArrowRight } from "lucide-react";
import type { CategorySummary } from "@/types";
import { t } from "@/i8n";

interface CategoryCardProps {
  category: CategorySummary;
  variant?: 'default' | 'compact';
}

export function CategoryCard({ category, variant = 'default' }: CategoryCardProps) {
  if (variant === 'compact') {
    return (
      <Link to={`/categories/${category.slug}`}>
        <Card className="group transition-all duration-300 hover:shadow-md hover:border-primary/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Folder className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-card-foreground group-hover:text-primary transition-colors">
                  {category.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {category.item_quantity} {t("category.products")}
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link to={`/categories/${category.slug}`}>
      <Card className="group h-full transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Folder className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-semibold text-card-foreground mb-1 group-hover:text-primary transition-colors">
            {category.name}
          </h3>
          <p className="text-2xl font-bold text-primary mb-2">
            {category.item_quantity}
          </p>
          <p className="text-sm text-muted-foreground">{t("category.products")}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
