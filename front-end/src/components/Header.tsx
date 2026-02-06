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
import { LanguageSelector } from "./LanguageSelector";
import { t } from "@/i8n";
import { SearchBar } from "./SearchBar";

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
  const [lang, setLang] = useState<string>(() => localStorage.getItem('lang') || 'pb');

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
      const currentLang = localStorage.getItem('lang');
      
      if (currentLang && currentLang !== lang) {
        localStorage.setItem('lang', lang);
        window.location.reload();
      } else {
        localStorage.setItem('lang', lang);
      }
      
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
      <div className="container mx-auto px-4 md:px-6 flex h-16 items-center justify-between gap-4">
        
        <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80 flex-shrink-0">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Activity className="w-6 h-6 text-primary" />
          </div>
          <span className="font-bold text-xl tracking-tight hidden sm:block">
            <span className="text-primary">Indu</span>
            <span className="text-foreground">Mine</span>
          </span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-8 ml-4">
          <Link to="/" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {t("header.dashboard")}
          </Link>
          <Link to="/categories" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {t("header.categories")}
          </Link>
          {userData?.role === "admin" && (
            <Link to="/admin" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              {t("header.admin")}
            </Link>
          )}
        </nav>

        <div className="hidden lg:flex flex-1 justify-center max-w-md px-4">
          <SearchBar />
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <LanguageSelector lang={lang} setLang={setLang} />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 gap-2 border-primary/20 hover:bg-primary/5 transition-colors"
              >
                <Palette className="w-4 h-4" />
                <span className="hidden xl:inline">{t("header.theme")}</span>
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
                {t("header.select-theme")}
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

          <DropdownMenu 
            open={userMenuOpen} 
            onOpenChange={(open) => {
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
                className="h-9 gap-2 border-primary/20 hover:bg-primary/5 transition-colors">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">
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
                  <span className="font-medium">{t("header.role")}:</span> {userData?.role}
                </div>
              </DropdownMenuLabel>
              
              <DropdownMenuSeparator />
              
              <div className="p-2 space-y-3">
                {isEditing ? (
                  <form onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }} className="space-y-3">
                    <div className="space-y-2">
                      <label 
                        className="text-xs font-medium"
                        style={{ color: 'hsl(var(--muted-foreground))' }}
                      >
                        {t("header.full-name")}
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
                        placeholder={t("header.full-name-placeholder")}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label 
                        className="text-xs font-medium"
                        style={{ color: 'hsl(var(--muted-foreground))' }}
                      >
                        {t("header.email")}
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
                        {t("header.new-password")}
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
                        {t("actions.save")}
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
                      <span>{t("header.edit-profile")}</span>
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
                            <span>{t("header.allowed-categories")}</span>
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
                <span>{t("actions.logout")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}