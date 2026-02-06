import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, Loader2, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { API_BASE_URL, getAuthToken } from "@/lib/api";
import { t } from "@/i8n";

interface ProductResult {
  id: string;
  name: string;
  category_slug?: string;
}

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const lang = localStorage.getItem('lang') || 'pb';

  // Debounce para a pesquisa
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        performSearch();
      } else {
        setResults([]);
        setOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(
        `${API_BASE_URL}/search?q=${encodeURIComponent(query)}&limit=5&lang=${lang}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setResults(data);
        setOpen(data.length > 0);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (product: ProductResult) => {
    setOpen(false);
    setQuery("");
    navigate(`/products/${product.id}`); 
    };

  return (
    <div className="relative w-full max-w-md group">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary" />
          <Input
            type="search"
            placeholder={t("header.search-placeholder") || "Buscar produtos..."}
            className="pl-9 bg-background/50 border-primary/20 focus-visible:ring-primary w-full"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                setOpen(false);
                navigate(`/search?q=${encodeURIComponent(query)}`);
              }
            }}
          />
          {loading && (
            <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <DropdownMenuContent 
          className="w-[var(--radix-dropdown-menu-trigger-width)]" 
          align="start"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DropdownMenuLabel className="text-xs text-muted-foreground flex justify-between">
            {t("search.quick-results") || "Resultados Rápidos"}
            <span>{results.length} encontrados</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {results.map((product) => (
            <DropdownMenuItem 
              key={product.id}
              onClick={() => handleSelectProduct(product)}
              className="cursor-pointer flex flex-col items-start py-2"
            >
              <div className="flex items-center gap-2 w-full">
                <Package className="w-4 h-4 text-primary shrink-0" />
                <span className="font-medium truncate">{product.name}</span>
              </div>
              <span className="text-[10px] text-muted-foreground ml-6">
                ID: {product.id} • {product.category_slug}
              </span>
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="justify-center text-primary font-semibold"
            onClick={() => navigate(`/search?q=${encodeURIComponent(query)}`)}
          >
            {t("search.view-all") || "Ver todos os resultados"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}