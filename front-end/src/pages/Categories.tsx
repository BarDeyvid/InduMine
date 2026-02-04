import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { CategoryCard } from "@/components/CategoryCard";
import { CategoryCardSkeleton } from "@/components/SkeletonCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ArrowLeft, Folder, LayoutGrid } from "lucide-react";
import { getCategories } from "@/lib/api";
import type { CategorySummary } from "@/types";
import { t } from "@/i8n";

export default function Categories() {
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      try {
        // Simula um pequeno delay para o skeleton ser visível como no CategoryDetail
        await new Promise(resolve => setTimeout(resolve, 400));
        const data = await getCategories();
        setCategories(data);
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar as categorias.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Header />

      <main className="container py-8">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">{t("categories.home")}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{t("categories.categories")}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Botão Voltar */}
        <Link to="/">
          <Button variant="ghost" size="sm" className="mb-4 gap-2">
            <ArrowLeft className="w-4 h-4" />
            {t("categories.back_to_dashboard")}
          </Button>
        </Link>

        {/* Header da Página */}
        <Card className="mb-8 animate-fade-in">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start gap-4 md:gap-6">
              <div className="p-4 rounded-2xl bg-primary/10 flex-shrink-0">
                <LayoutGrid className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                  {t("categories.all_categories")}
                </h1>
                <p className="text-muted-foreground mb-4">
                  {t("categories.description")}
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 text-secondary-foreground">
                  <Folder className="w-4 h-4" />
                  <span className="font-semibold">{categories.length}</span>
                  <span className="opacity-70">{t("categories.mapped_categories")}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grid de Categorias */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {isLoading ? (
            // Exibe 10 skeletons enquanto carrega
            Array.from({ length: 10 }).map((_, i) => (
              <CategoryCardSkeleton key={i} />
            ))
          ) : error ? (
            <div className="col-span-full py-12 text-center">
              <p className="text-destructive">{error}</p>
            </div>
          ) : (
            categories.map((category, index) => (
              <div
                key={category.slug}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <CategoryCard category={category} />
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}