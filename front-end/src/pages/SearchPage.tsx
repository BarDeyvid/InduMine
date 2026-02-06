import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Package, ChevronRight, AlertCircle, Loader2 } from "lucide-react";
import { API_BASE_URL, getAuthToken } from "@/lib/api";
import { t } from "@/i8n";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [rawProducts, setRawProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const lang = localStorage.getItem('lang') || 'pb';

  const products = useMemo(() => {
    return rawProducts.map((p: any) => ({
      ...p,
      id: p.product_code || p.id, 
      category_slug: p.category_slug || 'all'
    }));
  }, [rawProducts]);

  useEffect(() => {
    const fetchFullResults = async () => {
      if (!query) return;
      setLoading(true);
      try {
        const token = getAuthToken();
        const response = await fetch(
          `${API_BASE_URL}/search?q=${encodeURIComponent(query)}&limit=50&lang=${lang}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (response.ok) {
          const data = await response.json();
          setRawProducts(data);
        }
      } catch (error) {
        console.error("Search page error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFullResults();
  }, [query, lang]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{t("search.searching") || "Buscando resultados..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <main className="container py-8 max-w-5xl px-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-8 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">{t("search.results") || "Resultados da busca"}</span>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {t("search.showing-results") || "Resultados para"}: <span className="text-primary">"{query}"</span>
          </h1>
          <p className="text-muted-foreground">
            {products.length} {t("search.items-found") || "produtos encontrados"}
          </p>
        </div>

        {products.length > 0 ? (
          <div className="grid gap-4">
            {products.map((product) => (
              <Link 
                key={product.id} 
                to={`/products/${product.id}`}
              >
                <Card className="hover:border-primary/50 transition-colors group overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-center p-4 gap-6">
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center shrink-0 group-hover:bg-primary/5 transition-colors">
                        <Package className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {product.id}
                          </span>
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">
                            {product.category_slug}
                          </span>
                        </div>
                        <h2 className="font-semibold text-lg truncate">{product.name}</h2>
                        {product.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {product.description}
                          </p>
                        )}
                      </div>
                      
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-muted/30 rounded-2xl border-2 border-dashed border-muted">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t("search.no-results") || "Nenhum resultado encontrado"}</h2>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {t("search.try-different") || "Tente termos diferentes ou verifique se você tem permissão para a categoria."}
            </p>
          </div>
        )}
      </main> 
    </div>
  );
}