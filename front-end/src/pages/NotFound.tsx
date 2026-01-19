import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background dark flex items-center justify-center p-4">
      <div className="text-center animate-fade-in">
        <div className="mb-6">
          <span className="text-8xl font-bold gradient-text">404</span>
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Página não encontrada
        </h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          A página que você está procurando não existe ou foi movida para outro endereço.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => window.history.back()} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <Button asChild className="gap-2">
            <Link to="/">
              <Home className="w-4 h-4" />
              Ir para o início
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;