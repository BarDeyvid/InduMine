import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { Check } from "lucide-react";

const languages = [
  { code: 'pt', flag: '🇧🇷', label: 'Português' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'en', flag: '🇺🇸', label: 'English' },
];

export function LanguageSelector({ lang, setLang }: { lang: string; setLang: (lang: string) => void }) {
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
    return (
    <div className="hidden sm:flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-xl">
                  {languages.find(l => l.code === lang)?.flag || '🌐'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="min-w-[8rem]">
                {languages.map((l) => (
                  <DropdownMenuItem
                    key={l.code}
                    className={cn(
                      "flex items-center justify-between cursor-pointer",
                      lang === l.code && "bg-accent"
                    )}
                    onClick={() => setLang(l.code)}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{l.flag}</span>
                      <span className="text-sm">{l.label}</span>
                    </span>
                    {lang === l.code && <Check className="w-4 h-4 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
    );
}