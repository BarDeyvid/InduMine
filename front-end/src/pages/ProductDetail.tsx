import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { StatusBadge } from "@/components/ui/status-badge";
import { SpecsTable } from "@/components/SpecsTable";
import { RelatedProducts } from "@/components/RelatedProducts";
import { ErrorState } from "@/components/ErrorState";
import { SpecsTableSkeleton } from "@/components/SkeletonCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Package, ArrowLeft, ExternalLink } from "lucide-react";
import { getProductById, getProductsByCategory, getCategoryBySlug } from "@/lib/api"; 
import { addRecentProduct } from "@/lib/storage";
import type { CategorySummary, Product } from "@/types";
import { t } from "@/i8n";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<CategorySummary | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // 1. Busca o produto pelo código
        const found = await getProductById(id || '');
        
        if (!found) {
          setError('Produto não encontrado');
          setIsLoading(false);
          return;
        }

        // Helper function to parse image array from JSON string
        const parseImageUrl = (imageData: string | string[]): string | null => {
          try {
            if (typeof imageData === 'string') {
              // If it's a JSON string array
              if (imageData.startsWith('[')) {
                const parsed = JSON.parse(imageData);
                return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
              }
              // If it's a direct URL string
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

        // 2. Mapeia os dados da API para o estado do componente
        const formattedProduct: Product = {
          ...found,
          id: found.product_code,
          name: found.name,
          photo: parseImageUrl(found.image),
          description: `${found.name}`,
          main_specs: filterSystemSpecs(found.specifications),
          status: 'active',
          url: found.url,
          category_slug: found.category_slug,
          category_path: found.category_path,
        };

        // 3. Busca produtos relacionados da mesma categoria
        const categorySlug = found.category_slug || '';
        const rawRelated = await getProductsByCategory(categorySlug);
        
        const related = (rawRelated as any[])
          .filter((p) => p.product_code !== found.product_code)
          .map((p) => ({
            id: p.product_code,
            product_code: p.product_code,
            name: p.name,
            photo: parseImageUrl(p.image),
            category_slug: categorySlug,
            status: 'active' as const,
            description: p.name,
            main_specs: filterSystemSpecs(p.specifications),
            url: p.url,
            category_path: p.category_path,
          }))
          .slice(0, 4);

        setProduct({ ...formattedProduct, related_products: related });
        
        // Salva no histórico local
        addRecentProduct({
          id: found.product_code,
          product_code: found.product_code,
          name: formattedProduct.name,
          photo: formattedProduct.photo,
          category_slug: categorySlug,
        });

      } catch (err) {
        console.error(err);
        setError('Erro ao carregar produto');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (product && (product as any).category_slug) {
      getCategoryBySlug((product as any).category_slug).then(setCategory);
    }
  }, [product]);

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground transition-colors duration-500">
        <Header />
        <main className="container py-8">
          <ErrorState
            title={t("error.not_found_title")}
            message={t("error.not_found_message")}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500">
      <Header />
      
      <main className="container py-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/">{t("header.dashboard")}</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            
            {/* Mostrar category path completo se disponível */}
            {product?.category_path ? (
              <>
                {product.category_path.split(' > ').slice(0, -1).map((categoryName, index, array) => (
                  <div key={`breadcrumb-${categoryName}-${index}`} className="flex items-center gap-1.5">
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-sm">
                        {categoryName}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                    {index < array.length - 1 && <BreadcrumbSeparator />}
                  </div>
                ))}
                <BreadcrumbSeparator />
              </>
            ) : category && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={`/categories/${category.slug}`}>{category.name}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            )}
            
            <BreadcrumbItem>
              <BreadcrumbPage>
                {isLoading ? <Skeleton className="h-4 w-32" /> : product?.name}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Link to={category ? `/categories/${category.slug}` : '/'}>
          <Button variant="ghost" size="sm" className="mb-4 gap-2">
            <ArrowLeft className="w-4 h-4" /> {t("header.back_to_dashboard")}
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Exibição da Foto do Produto */}
          <Card className="overflow-hidden">
            <div className="aspect-square bg-muted/30 flex items-center justify-center p-4">
              {isLoading ? (
                <Skeleton className="w-full h-full" />
              ) : product?.photo ? (
                <img
                  src={product.photo}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <Package className="w-32 h-32 text-muted-foreground/30" />
              )}
            </div>
          </Card>

          <div className="space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                    {product?.product_code}
                  </span>
                  <StatusBadge status={product?.status || 'active'} />
                </div>
                
                <h1 className="text-3xl font-bold text-foreground">{product?.name}</h1>
                
                {/* Enhanced Description Display */}
                <div className="bg-muted/40 rounded-lg p-4 border border-muted/60">
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap break-words">
                    {product?.description}
                  </p>
                </div>

                {product?.url && (
                  <Button variant="outline" className="gap-2" asChild>
                    <a href={product.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" /> {t("product.view_on_supplier_site")}
                    </a>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <Tabs defaultValue="especificacoes" className="animate-slide-up">
          <TabsList className="mb-6">
            <TabsTrigger value="especificacoes">{t("product.specifications")}</TabsTrigger>
            <TabsTrigger value="descricao">{t("product.full_description")}</TabsTrigger>
          </TabsList>

          <TabsContent value="especificacoes">
            <Card>
              <CardHeader>
                <CardTitle>{t("product.specifications")}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <SpecsTableSkeleton />
                ) : product?.main_specs ? (
                  <SpecsTable specs={product.main_specs} /> 
                ) : (
                  <p className="text-muted-foreground">{t("specs_table.empty")}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="descricao">
            <Card>
              <CardHeader>
                <CardTitle>{t("product.full_description")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                    {product?.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {product?.related_products && product.related_products.length > 0 && (
          <div className="mt-12">
            <RelatedProducts products={product.related_products} />
          </div>
        )}
      </main>
    </div>
  );
}