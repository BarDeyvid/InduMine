import { useState, useCallback, useRef, useEffect } from 'react';
import { useNetworkStatus } from '@/hooks/use-network-status'; // O hook que você enviou
import { getProductsByCategory } from '@/lib/api';

// Configuração de tamanhos baseados na rede
const BATCH_SIZES = {
  slow: 4,    // Conexão lenta: lotes pequenos para resposta rápida
  medium: 6, // Conexão média
  fast: 12    // Conexão rápida: lotes grandes para menos requests
};

export function useAdaptiveProductBatch(categorySlug: string) {
  const { quality } = useNetworkStatus();
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Ref para controlar paginação sem re-renderizar
  const offsetRef = useRef(0);
  
  // Define o tamanho do batch atual baseado na qualidade da rede
  const currentBatchSize = BATCH_SIZES[quality] || BATCH_SIZES.medium;

  const loadNextBatch = useCallback(async (reset = false) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Se for reset, zera o offset
      const skip = reset ? 0 : offsetRef.current;
      
      const newProducts = await getProductsByCategory(
        categorySlug, 
        skip, 
        currentBatchSize
      );

      if (reset) {
        setProducts(newProducts);
        offsetRef.current = newProducts.length;
      } else {
        setProducts(prev => [...prev, ...newProducts]);
        offsetRef.current += newProducts.length;
      }

      // Se vieram menos produtos que o limite, acabou a lista
      if (newProducts.length < currentBatchSize) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

    } catch (err: any) {
      setError(err.message || 'Erro ao carregar produtos');
    } finally {
      setIsLoading(false);
    }
  }, [categorySlug, currentBatchSize, isLoading]);

  // Reset inicial quando a categoria muda
  useEffect(() => {
    offsetRef.current = 0;
    setHasMore(true);
    loadNextBatch(true);
  }, [categorySlug]);

  return {
    products,
    isLoading,
    hasMore,
    error,
    loadNextBatch,
    currentBatchSize // Útil para debug/UI
  };
}