import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { UserPlus, ArrowLeft, Loader2 } from "lucide-react";
import { registerUser } from "@/lib/api";

export default function Register() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    full_name: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Erro de validação",
        description: "As senhas não coincidem."
      });
      return;
    }

    setIsLoading(true);
    try {
      await registerUser({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name || undefined
      });

      toast({ 
        title: "Conta criada com sucesso!", 
        description: "Faça login para continuar." 
      });
      navigate("/login");
      
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Erro no cadastro", 
        description: error.message || "Não foi possível criar a conta." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background dark flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[10%] left-[20%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <Card className="w-full max-w-md border-primary/10 bg-card/60 backdrop-blur-md shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-2 ring-1 ring-primary/20">
            <UserPlus className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Criar Conta</CardTitle>
          <CardDescription>Junte-se ao InduMine.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input 
                id="full_name"
                placeholder="Seu nome" 
                value={formData.full_name} 
                onChange={handleChange} 
                className="bg-background/50 border-primary/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <Input 
                  id="username"
                  placeholder="user.name" 
                  value={formData.username} 
                  onChange={handleChange} 
                  required 
                  className="bg-background/50 border-primary/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email"
                  type="email"
                  placeholder="email@corp.com" 
                  value={formData.email} 
                  onChange={handleChange} 
                  required 
                  className="bg-background/50 border-primary/10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input 
                id="password"
                type="password" 
                value={formData.password} 
                onChange={handleChange} 
                required 
                className="bg-background/50 border-primary/10"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input 
                id="confirmPassword"
                type="password" 
                value={formData.confirmPassword} 
                onChange={handleChange} 
                required 
                className="bg-background/50 border-primary/10"
              />
            </div>

            <Button className="w-full mt-4" type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                "Finalizar Cadastro"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-border/40 pt-6">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}