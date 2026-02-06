import { useState, useEffect, useRef, useMemo } from "react"; // Added useMemo
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { ProductCard } from "@/components/ProductCard";
import { CategoryCard } from "@/components/CategoryCard";
import { ErrorState } from "@/components/ErrorState";
import { ProductCardSkeleton } from "@/components/SkeletonCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ArrowLeft, Folder, Package } from "lucide-react";
import { getCategoryBySlug } from "@/lib/api";
import type { CategorySummary, Product } from "@/types"; 
import { useAdaptiveProductBatch } from "@/hooks/use-adaptive-batch"; 
import { t } from "@/i8n";

export default function CategoryDetail() {
  const { slug } = useParams<{ slug: string }>();
  
  const [category, setCategory] = useState<CategorySummary | null>(null);
  const [catLoading, setCatLoading] = useState(true);
  const [relatedCategories, setRelatedCategories] = useState<CategorySummary[]>([]);

  const { 
    products: rawProducts, 
    isLoading: productsLoading, 
    hasMore, 
    loadNextBatch, 
    error 
  } = useAdaptiveProductBatch(slug || '');

  const observerTarget = useRef<HTMLDivElement>(null);

  const parseImageUrl = (imageData: string | string[] | null): string | null => {
    try {
      if (!imageData) return null;
      if (typeof imageData === 'string') {
        if (imageData.startsWith('[')) {
          const parsed = JSON.parse(imageData);
          return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
        }
        return imageData;
      }
      if (Array.isArray(imageData)) {
        return imageData.length > 0 ? imageData[0] : null;
      }
      return null;
    } catch {
      return null;
    }
  };

  const products = useMemo(() => {
    return rawProducts.map((p: any): Product => ({
      ...p,
      id: p.product_code || p.id, 
      product_code: p.product_code || p.id,
      photo: parseImageUrl(p.image || p.photo), 
      status: p.status || 'active',
      description: p.description || p.name,
      category_slug: slug || '',
    }));
  }, [rawProducts, slug]);

  useEffect(() => {
    const fetchCategoryDetails = async () => {
      if (!slug) return;
      setCatLoading(true);
      try {
        const catData = await getCategoryBySlug(slug);
        setCategory(catData);
      } catch (err) {
        console.error("Erro ao carregar categoria:", err);
      } finally {
        setCatLoading(false);
      }
    };
    fetchCategoryDetails();
  }, [slug]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !productsLoading) {
          loadNextBatch();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) observer.unobserve(observerTarget.current);
    };
  }, [hasMore, productsLoading, loadNextBatch]);

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <Header />
        <main className="container py-8">
          <ErrorState
            title={t('error.loading_title')}
            message={error || t('error.loading_message')}
          />
        </main>
      </div>
    );
  }

  if (!catLoading && !category) return <ErrorState />;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Header />
      
      <main className="container py-8 px-4 md:px-6">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">{t('categories.home')}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                {catLoading ? <Skeleton className="h-4 w-24" /> : category?.name}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Link to="/">
          <Button variant="ghost" size="sm" className="mb-4 gap-2 pl-0 hover:pl-2 transition-all">
            <ArrowLeft className="w-4 h-4" />
            {t('categories.back_to_dashboard')}
          </Button>
        </Link>

        <Card className="mb-8 animate-fade-in border-border/50 shadow-sm">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start gap-4 md:gap-6">
              <div className="p-4 rounded-2xl bg-primary/10 flex-shrink-0">
                <Folder className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                {catLoading ? (
                  <>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-full max-w-md mb-4" />
                    <Skeleton className="h-10 w-32" />
                  </>
                ) : (
                  <>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                      {category?.name}
                    </h1>
                    <p className="text-muted-foreground mb-4">
                      {category?.description || t('category.description_fallback')}
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm">
                      <Package className="w-4 h-4" />
                      <span className="font-semibold">{category?.item_quantity || products.length}</span>
                      <span className="opacity-70">{t('category.products')}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-12">
          <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
            {t('category.products')}
            {productsLoading && products.length > 0 && (
               <span className="text-xs font-normal text-muted-foreground animate-pulse">
                 ...
               </span>
            )}
          </h2>
          
          {productsLoading && products.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product, index) => (
                  <div
                    key={`${product.id}-${index}`} 
                    className="animate-slide-up"
                    style={{ animationDelay: `${(index % 10) * 0.05}s` }}
                  >
                    <ProductCard product={product} />
                  </div>
                ))}

                {productsLoading && (
                  Array.from({ length: 4 }).map((_, i) => (
                    <ProductCardSkeleton key={`loading-more-${i}`} />
                  ))
                )}
              </div>

              <div ref={observerTarget} className="h-4 w-full mt-8" />
              
              {!hasMore && (
                <div className="text-center py-8 text-muted-foreground text-sm border-t mt-8 border-border/40">
                  {t('category.no_more_products')}
                </div>
              )}
            </>
          ) : (
            <Card className="border-dashed bg-muted/20">
              <CardContent className="py-16 text-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {t('categories.empty')}
                </h3>
                <p className="text-muted-foreground">
                  {t('categories.no_products')}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {relatedCategories.length > 0 && (
          <div className="animate-slide-up mt-12 border-t pt-8">
            <h2 className="text-xl font-semibold text-foreground mb-6">
              {t('categories.related_categories')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedCategories.map((cat) => (
                <CategoryCard key={cat.slug} category={cat} variant="compact" />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}