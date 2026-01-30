import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  User, 
  LogOut, 
  Palette,
  Check,
  Settings,
  Save,
  X,
  Briefcase,
  Loader2,
  Shield
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout, getAuthToken, API_BASE_URL } from "@/lib/api";
import { useTheme, ThemeName, availableThemes } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface UserData {
  id: number;
  username: string;
  email: string;
  full_name: string | null;
  role: string;
  allowed_categories: string[];
}

export function Header() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    full_name: "",
    email: "",
    password: "",
  });
  const [saving, setSaving] = useState(false);
  const [lang, setLang] = useState<string>(() => localStorage.getItem('lang') || 'pt');

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    localStorage.setItem('lang', lang);
    // notify other components/request helpers
    window.dispatchEvent(new Event('lang-changed'));
  }, [lang]);

  const fetchUserData = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        logout();
        navigate("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }

      const data = await response.json();
      setUserData(data);
      setEditData({
        full_name: data.full_name || "",
        email: data.email,
        password: "",
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSaveProfile = async () => {
    if (!userData) return;
    
    setSaving(true);
    try {
      const token = getAuthToken();
      if (!token) {
        navigate("/login");
        return;
      }

      // Prepare update data (remove empty fields)
      const updateData: any = {};
      if (editData.full_name !== userData.full_name) {
        updateData.full_name = editData.full_name || null;
      }
      if (editData.email !== userData.email) {
        updateData.email = editData.email;
      }
      if (editData.password.trim()) {
        updateData.password = editData.password;
      }

      const response = await fetch(`${API_BASE_URL}/users/me`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error("Failed to update user");
      }

      const updatedUser = await response.json();
      setUserData(updatedUser);
      setIsEditing(false);
      setEditData(prev => ({ ...prev, password: "" }));
    } catch (error) {
      console.error("Error updating user:", error);
    } finally {
      setSaving(false);
    }
  };

  const ThemePreview = ({ themeKey, themeConfig, isActive }: { 
    themeKey: string; 
    themeConfig: any; 
    isActive: boolean;
  }) => (
    <div className="flex items-center gap-3 w-full">
      {/* Theme preview block with actual theme colors */}
      <div className={cn(
        "flex h-8 w-8 rounded-md border border-border/40 overflow-hidden",
        "transition-all duration-200"
      )}>
        <div className="flex-1 relative">
          {/* Background color */}
          <div 
            className="absolute inset-0"
            style={{ 
              backgroundColor: `hsl(${themeConfig.vars["--background"]})`,
            }}
          />
          {/* Card color overlay */}
          <div 
            className="absolute top-1 left-1 right-1 bottom-1 rounded-sm"
            style={{ 
              backgroundColor: `hsl(${themeConfig.vars["--card"]})`,
            }}
          />
          {/* Primary color accent */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-1"
            style={{ 
              backgroundColor: `hsl(${themeConfig.vars["--primary"]})`,
            }}
          />
        </div>
        <div className="flex-1 relative">
          {/* Muted background */}
          <div 
            className="absolute inset-0"
            style={{ 
              backgroundColor: `hsl(${themeConfig.vars["--muted"]})`,
            }}
          />
          {/* Foreground text preview */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ 
                backgroundColor: `hsl(${themeConfig.vars["--foreground"]})`,
                opacity: 0.8
              }}
            />
          </div>
        </div>
      </div>
      <span className={cn(
        "text-sm font-medium transition-colors",
        isActive ? "text-foreground" : "text-muted-foreground"
      )}>
        {themeConfig.name}
      </span>
    </div>
  );

  const handleEditClick = () => {
    if (userData) {
      setEditData({
        full_name: userData.full_name || "",
        email: userData.email,
        password: "",
      });
    }
    setIsEditing(true);
  };

  if (loading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <span className="font-bold text-xl tracking-tight">
              <span className="text-primary">Indu</span>
              <span className="text-foreground">Mine</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Activity className="w-6 h-6 text-primary" />
          </div>
          <span className="font-bold text-xl tracking-tight">
            <span className="text-primary">Indu</span>
            <span className="text-foreground">Mine</span>
          </span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">Dashboard</Link>
          <Link to="/categories" className="text-sm font-medium text-muted-foreground hover:text-foreground">Categorias</Link>
          {userData?.role === "admin" && (
            <Link to="/admin" className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1">
              <Shield className="w-4 h-4" />
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {/* Language selector */}
          <div className="hidden sm:flex items-center gap-2">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="px-2 py-1 text-sm rounded bg-background border"
              style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
            >
              <option value="pt">Português</option>
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>
          {/* Theme Selector Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 border-primary/20 hover:bg-primary/5 transition-colors"
              >
                <Palette className="w-4 h-4" />
                <span className="hidden sm:inline">Tema</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-64"
              style={{
                backgroundColor: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
                color: 'hsl(var(--foreground))'
              }}
            >
              <DropdownMenuLabel className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Selecionar Tema
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {Object.entries(availableThemes).map(([key, config]) => (
                <DropdownMenuItem 
                  key={key}
                  className={cn(
                    "cursor-pointer flex items-center justify-between p-3 rounded-md transition-all",
                    theme === key 
                      ? "bg-accent border border-accent-foreground/10" 
                      : "hover:bg-accent/50"
                  )}
                  onClick={() => setTheme(key as ThemeName)}
                >
                  <ThemePreview 
                    themeKey={key}
                    themeConfig={config}
                    isActive={theme === key}
                  />
                  {theme === key && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Settings Menu */}
          <DropdownMenu 
            open={userMenuOpen} 
            onOpenChange={(open) => {
              // Don't close if we're editing
              if (isEditing && !open) {
                setUserMenuOpen(true);
              } else {
                setUserMenuOpen(open);
                if (!open) setIsEditing(false);
              }
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 border-primary/20 hover:bg-primary/5 transition-colors"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {userData?.username || "Usuário"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-64"
              style={{
                backgroundColor: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
                color: 'hsl(var(--foreground))'
              }}
            >
              <DropdownMenuLabel className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: 'hsl(var(--primary) / 0.1)',
                      color: 'hsl(var(--primary))'
                    }}
                  >
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">
                      {userData?.full_name || userData?.username || "Usuário"}
                    </p>
                    <p 
                      className="text-xs"
                      style={{ color: 'hsl(var(--muted-foreground))' }}
                    >
                      {userData?.email}
                    </p>
                  </div>
                </div>
                <div 
                  className="mt-2 px-2 py-1 rounded text-xs"
                  style={{
                    backgroundColor: 'hsl(var(--muted))'
                  }}
                >
                  <span className="font-medium">Função:</span> {userData?.role}
                </div>
              </DropdownMenuLabel>
              
              <DropdownMenuSeparator />
              
              {/* Edit Profile Section */}
              <div className="p-2 space-y-3">
                {isEditing ? (
                  <form onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }} className="space-y-3">
                    <div className="space-y-2">
                      <label 
                        className="text-xs font-medium"
                        style={{ color: 'hsl(var(--muted-foreground))' }}
                      >
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        value={editData.full_name || ""}
                        onChange={(e) => setEditData({...editData, full_name: e.target.value})}
                        className="w-full px-2 py-1 text-sm rounded bg-background"
                        style={{
                          border: '1px solid hsl(var(--border))',
                          color: 'hsl(var(--foreground))'
                        }}
                        placeholder="Seu nome completo"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label 
                        className="text-xs font-medium"
                        style={{ color: 'hsl(var(--muted-foreground))' }}
                      >
                        Email
                      </label>
                      <input
                        type="email"
                        value={editData.email}
                        onChange={(e) => setEditData({...editData, email: e.target.value})}
                        className="w-full px-2 py-1 text-sm rounded bg-background"
                        style={{
                          border: '1px solid hsl(var(--border))',
                          color: 'hsl(var(--foreground))'
                        }}
                        placeholder="seu@email.com"
                        autoComplete="email"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label 
                        className="text-xs font-medium"
                        style={{ color: 'hsl(var(--muted-foreground))' }}
                      >
                        Nova Senha (opcional)
                      </label>
                      <input
                        type="password"
                        value={editData.password}
                        onChange={(e) => setEditData({...editData, password: e.target.value})}
                        className="w-full px-2 py-1 text-sm rounded bg-background"
                        style={{
                          border: '1px solid hsl(var(--border))',
                          color: 'hsl(var(--foreground))'
                        }}
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button
                        type="submit"
                        size="sm"
                        className="flex-1 gap-2"
                        disabled={saving}
                      >
                        {saving ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3" />
                        )}
                        Salvar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setUserMenuOpen(false);
                        }}
                        disabled={saving}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <DropdownMenuItem 
                      className="cursor-pointer flex items-center gap-2"
                      onClick={handleEditClick}
                    >
                      <Settings className="w-4 h-4" />
                      <span>Editar Perfil</span>
                    </DropdownMenuItem>
                    
                    {userData?.allowed_categories && userData.allowed_categories.length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        
                        <div className="space-y-1">
                          <div 
                            className="flex items-center gap-2 px-2 py-1 text-sm"
                            style={{ color: 'hsl(var(--muted-foreground))' }}
                          >
                            <Briefcase className="w-4 h-4" />
                            <span>Categorias Permitidas:</span>
                          </div>
                          <div className="flex flex-wrap gap-1 px-2">
                            {userData.allowed_categories.map((cat: string) => (
                              <span 
                                key={cat}
                                className="px-2 py-1 text-xs rounded"
                                style={{
                                  backgroundColor: 'hsl(var(--primary) / 0.1)',
                                  color: 'hsl(var(--primary))'
                                }}
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={handleLogout} 
                className="cursor-pointer"
                style={{
                  color: 'hsl(var(--destructive))',
                  backgroundColor: 'hsl(var(--destructive) / 0.1)'
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}