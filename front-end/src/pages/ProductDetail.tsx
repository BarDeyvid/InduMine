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

        // 2. Mapeia os dados da API (image e specifications) para o estado do componente
        const formattedProduct: Product = {
          ...found,
          id: found.product_code,
          name: found.specifications?.Model || found.specifications?.Name || found.product_code,
          photo: found.image, // Mapeia 'image' do JSON para 'photo'
          description: found.specifications?.Description || "Sem descrição disponível.",
          main_specs: found.specifications, // Usa o objeto de especificações da API
          status: 'active'
        };

        // 3. Busca produtos relacionados da mesma categoria
        const categorySlug = (found as any).category_slug || '';
        const rawRelated = await getProductsByCategory(categorySlug);
        
        const related = (rawRelated as any[])
          .filter((p) => p.product_code !== found.product_code)
          .map((p) => ({
            id: p.product_code,
            product_code: p.product_code,
            name: p.specifications?.Model || p.product_code,
            photo: p.image,
            category_slug: categorySlug,
            // FIX: Use 'as const' or cast to the specific allowed literal
            status: 'active' as const, 
            price: 0,
            description: p.specifications?.Description || "Sem descrição disponível.",
            main_specs: p.specifications || {},
            dimension_specs: {},
          }))
          .slice(0, 4);

        setProduct({ ...formattedProduct, related_products: related });
        
        // Salva no histórico local
        addRecentProduct({
          id: found.product_code,
          product_code: found.product_code,
          name: formattedProduct.name,
          photo: found.image,
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
            title="Produto não encontrado"
            message="O produto que você está procurando não existe ou foi removido."
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
              <BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {category && (
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
            <ArrowLeft className="w-4 h-4" /> Voltar
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
                      <ExternalLink className="w-4 h-4" /> Ver no fabricante
                    </a>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <Tabs defaultValue="especificacoes" className="animate-slide-up">
          <TabsList className="mb-6">
            <TabsTrigger value="especificacoes">Especificações Técnicas</TabsTrigger>
            <TabsTrigger value="descricao">Descrição Completa</TabsTrigger>
          </TabsList>

          <TabsContent value="especificacoes">
            <Card>
              <CardHeader>
                <CardTitle>Detalhes Técnicos</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <SpecsTableSkeleton />
                ) : product?.main_specs ? (
                  <SpecsTable specs={product.main_specs} /> 
                ) : (
                  <p className="text-muted-foreground">Especificações não disponíveis.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="descricao">
            <Card>
              <CardHeader>
                <CardTitle>Descrição Completa do Produto</CardTitle>
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