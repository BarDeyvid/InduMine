import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { CategoryCard } from "@/components/CategoryCard";
import { StatsCard } from "@/components/StatsCard";
import { RecentProductsTable } from "@/components/RecentProductsTable";
import { CategoryCardSkeleton } from "@/components/SkeletonCard";
import { getCategories } from "@/lib/api";
import { getRecentProducts } from "@/lib/storage";
import { Package, Folder, Activity, Clock } from "lucide-react";
import type { CategorySummary, RecentProduct } from "@/types";

export default function Index() {
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch
    const fetchData = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      const categoriesData = await getCategories();
      setCategories(categoriesData);
      setRecentProducts(getRecentProducts());
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const totalProducts = categories.reduce((acc, cat) => acc + cat.item_quantity, 0);
  const lastSync = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Header />
      
      <main className="container py-8">
        {/* Page Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Bem-vindo ao catálogo técnico InduMine
          </p>
        </div>

        {/* Categories Navigation */}
        <div className="flex flex-wrap gap-2 mb-8 animate-slide-up">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 w-24 bg-secondary/50 rounded-lg animate-pulse" />
            ))
          ) : (
            categories.map((category) => (
              <a
                key={category.slug}
                href={`/categories/${category.slug}`}
                className="px-4 py-2 rounded-lg bg-secondary/50 text-secondary-foreground hover:bg-primary/20 hover:text-primary transition-colors text-sm font-medium border border-border/50"
              >
                {category.name}
              </a>
            ))
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Total de Produtos"
            value={isLoading ? "..." : totalProducts.toLocaleString('pt-BR')}
            icon={Package}
          />
          <StatsCard
            title="Categorias Mapeadas"
            value={isLoading ? "..." : categories.length}
            icon={Folder}
          />
          <StatsCard
            title="Saúde da Base"
            value="56%"
            icon={Activity}
            trend={{ value: 4, label: "desde último mês" }}
          />
          <StatsCard
            title="Última Sincronização"
            value={lastSync}
            icon={Clock}
          />
        </div>

        {/* Recent Products */}
        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <RecentProductsTable products={recentProducts} />
        </div>

        {/* Categories Grid */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Explorar Categorias
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <CategoryCardSkeleton key={i} />
                ))
              : categories.map((category) => (
                  <CategoryCard key={category.slug} category={category} />
                ))}
          </div>
        </div>
      </main>
    </div>
  );
}