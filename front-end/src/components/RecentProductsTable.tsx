import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { RecentProduct } from "@/types";
import { t } from "@/i8n";

interface RecentProductsTableProps {
  products: RecentProduct[];
}

export function RecentProductsTable({ products }: RecentProductsTableProps) {
  if (products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-primary" />
            {t("recent_products_table.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{t("recent_products_table.empty")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="w-5 h-5 text-primary" />
          {t("recent_products_table.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-6 px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("recent_products_table.product_name")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("recent_products_table.photo")}</TableHead>
                <TableHead>{t("recent_products_table.product_code")}</TableHead>
                <TableHead className="text-right">{t("recent_products_table.date")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} className="group">
                  <TableCell>
                    <Link 
                      to={`/products/${product.id}`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {product.name}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden">
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
                      <Package className={`w-5 h-5 text-muted-foreground/50 ${product.photo ? 'hidden' : ''}`} />
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {product.product_code}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {t("recent_products_table.date-suffix")}
                    {formatDistanceToNow(new Date(product.viewedAt), {})}
                    {t("recent_products_table.date-prefix")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
