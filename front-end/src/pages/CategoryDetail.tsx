import { useState, useEffect } from "react";
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
import { getCategoryBySlug, getProductsByCategory, getCategories } from "@/lib/api";
import type { CategorySummary, Product } from "@/types";
import { t } from "@/i8n";

export default function CategoryDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<CategorySummary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [relatedCategories, setRelatedCategories] = useState<CategorySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        await new Promise(resolve => setTimeout(resolve, 400));
        
        // 1. Fetch Category Info
        const foundCategory = await getCategoryBySlug(slug || '');
        
        if (!foundCategory) {
          setError('Categoria não encontrada');
          setIsLoading(false);
          return;
        }
        setCategory(foundCategory);

        // 2. Fetch Raw Products
        const rawProducts: any[] = await getProductsByCategory(slug || '');
        
        // Helper function to parse image array from JSON string
        const parseImageUrl = (imageData: string | string[]): string | null => {
          try {
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

        // Filter out metadata specs that shouldn't be displayed
        const filterSystemSpecs = (specs: Record<string, string>) => {
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
          return Object.entries(specs)
            .filter(([key]) => !systemFields.includes(key))
            .reduce((acc, [key, value]) => {
              acc[key] = value;
              return acc;
            }, {} as Record<string, string>);
        };
        
        // 3. TRANSFORM DATA: Map Backend response to Frontend Product type
        const validProducts: Product[] = rawProducts.map((p) => ({
          id: p.product_code,
          product_code: p.product_code,
          name: p.name,
          description: p.name,
          photo: parseImageUrl(p.image),
          url: p.url,
          status: 'active',
          category_slug: p.category_slug || slug || '',
          category_path: p.category_path || '',
          main_specs: filterSystemSpecs(p.specifications || {}),
        }));

        setProducts(validProducts);
        
        // 4. Fetch Related Categories
        const allCategories = await getCategories();
        setRelatedCategories(
          allCategories.filter(c => c.slug !== slug).slice(0, 4)
        );

      } catch (err) {
        console.error(err);
        setError(t('error.loading_message'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <Header />
        <main className="container py-8">
          <ErrorState
            title={t('error.loading_title')}
            message={t('error.loading_message')}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Header />
      
      <main className="container py-8">
        {/* Breadcrumb */}
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
                {isLoading ? <Skeleton className="h-4 w-24" /> : category?.name}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Back Button */}
        <Link to="/">
          <Button variant="ghost" size="sm" className="mb-4 gap-2">
            <ArrowLeft className="w-4 h-4" />
            {t('categories.back_to_dashboard')}
          </Button>
        </Link>

        {/* Category Header */}
        <Card className="mb-8 animate-fade-in">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start gap-4 md:gap-6">
              <div className="p-4 rounded-2xl bg-primary/10 flex-shrink-0">
                <Folder className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                {isLoading ? (
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
                      {category?.description || 'Explore os produtos desta categoria.'}
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary">
                      <Package className="w-4 h-4" />
                      <span className="font-semibold">{products.length}</span>
                      <span className="text-primary/70">{t('category.products')}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-foreground mb-6">
            {t('category.products')}
          </h2>
          
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product, index) => (
                <div
                  // [FIX] Use product_code as key since we ensured 'id' = 'product_code' above
                  key={product.id} 
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          ) : (
            <Card>
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

        {/* Related Categories */}
        {relatedCategories.length > 0 && (
          <div className="animate-slide-up">
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