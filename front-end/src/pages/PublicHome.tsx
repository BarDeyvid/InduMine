import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTheme, ThemeName, availableThemes } from "@/context/ThemeContext";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator } from "@radix-ui/react-dropdown-menu";
import { LiveStack } from "@/components/LiveStack";
import { t } from "@/i8n";

import {
  HardHat,
  Cpu,
  Database,
  ShieldCheck,
  Zap,
  Palette,
  Check,
  Globe,
  Settings2,
  ArrowRight,
  CheckCircle2
} from "lucide-react";

const CORE_FEATURES = [
  {
    title: t("index.catalog_title"),
    desc: t("index.catalog_desc"),
    icon: Database
  },
  {
    title: t("index.offline_title"),
    desc: t("index.offline_desc"),
    icon: Cpu
  },
  {
    title: t("index.global_title"),
    desc: t("index.global_desc"),
    icon: ShieldCheck
  },
  {
    title: t("index.realtime_title"),
    desc: t("index.realtime_desc"),
    icon: Zap
  }
];

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

export default function PublicHome() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="min-h-screen bg-background text-foreground">
      
      {/* NAVBAR */}
      <nav className="container flex items-center justify-between py-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-sm">
            <HardHat className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-black tracking-tight uppercase text-xl">
            InduMine
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Theme Selector Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 border-primary/20 hover:bg-primary/5 transition-colors"
              >
                <Palette className="w-4 h-4" />
                <span className="hidden sm:inline">{t("header.theme")}</span>
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
          <Button variant="ghost" className="font-bold uppercase tracking-widest text-xs" asChild>
            <Link to="/login">{t("register.login")}</Link>
          </Button>
        </div>
      </nav>

      {/* HERO */}
      <main className="container pt-20 pb-32">
        <section className="max-w-4xl space-y-8">

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{t("index.critical_environment")}</Badge>
            <Badge variant="outline">{t("index.offline_first")}</Badge>
            <Badge variant="outline">{t("index.reliable")}</Badge>
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight uppercase leading-[0.95]">
            {t("index.indumine_title")}  
            <br />
            <span className="text-primary italic">
              {t("index.indumine_subtitle")}
            </span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl">
            {t("index.indumine_description")}
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            <Button size="lg" className="font-bold" asChild>
              <Link to="/register" className="flex items-center gap-2">
                {t("index.get_started")}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>

            <Button size="lg" variant="outline" asChild>
              <Link to="/login">
                {t("index.access_system")}
              </Link>
            </Button>
          </div>
        </section>

        
      {/* LIVE STACK */}
      <section className="mt-32">
        <LiveStack />
      </section>

        {/* FEATURES */}
        <section className="mt-32">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-8">
            {t("index.core_capabilities")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CORE_FEATURES.map((f, i) => (
              <Card
                key={i}
                className="rounded-none border-muted bg-muted/30"
              >
                <CardContent className="p-6 flex gap-4">
                  <f.icon className="w-8 h-8 text-primary shrink-0" />
                  <div className="space-y-1">
                    <h3 className="font-bold uppercase text-sm">
                      {f.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {f.desc}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* TRUST / FOOTER MESSAGE */}
        <section className="mt-32 border-t border-muted pt-12">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            {t("index.developed_for_industrial_environments")}
          </div>
        </section>
      </main>
    </div>
  );
}
