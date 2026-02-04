import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { HardHat, ArrowRight, Loader2 } from "lucide-react";
import { login } from "@/lib/api";
import { t } from "@/i8n";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(username, password);
      toast({ 
        title: "Acesso Permitido", 
        description: "Bem-vindo de volta ao sistema InduMine." 
      });
      navigate("/");
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Acesso Negado", 
        description: error.message || "Credenciais inválidas." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[20%] -left-[10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]" />
      </div>

      <Card className="w-full max-w-md border-primary/10 bg-card/60 backdrop-blur-md shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="space-y-2 text-center pb-8">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 ring-1 ring-primary/20">
            <HardHat className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">{t("login.title")}</CardTitle>
          <CardDescription>
            {t("login.subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t("login.username_label")}</Label>
              <Input 
                id="username"
                placeholder="Ex: admin.user" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required 
                className="bg-background/50 border-primary/10 focus-visible:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("login.password_label")}</Label>
              </div>
              <Input 
                id="password"
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                autoComplete="current-password"
                className="bg-background/50 border-primary/10 focus-visible:ring-primary/30"
              />
            </div>
            <Button className="w-full mt-2 font-medium" type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("login.authenticating")}
                </>
              ) : (
                <>
                  {t("login.access_platform")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-border/40 pt-6">
          <p className="text-sm text-muted-foreground">
            {t("login.no_account")}{" "}
            <Link to="/register" className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors">
              {t("login.create_account")}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}