import {
  Cpu,
  Database,
  ShieldCheck,
  Zap,
  Globe,
  Settings2
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const PIPELINE = [
  {
    name: "Scraper",
    desc: "Coleta de dados externos",
    icon: Cpu,
  },
  {
    name: "MQTT Broker",
    desc: "Atualização de status",
    icon: Zap,
  },
  {
    name: "MySQL",
    desc: "Persistência central",
    icon: Database,
  },
  {
    name: "Backend API",
    desc: "Processamento e regras",
    icon: Settings2,
  },
  {
    name: "Frontend",
    desc: "Visualização e operação",
    icon: Globe,
  },
];

export function LiveStack() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % PIPELINE.length);
    }, 1100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
        Pipeline de Dados em Execução
      </h2>

      <div className="flex items-center gap-4 flex-wrap">
        {PIPELINE.map((item, index) => {
          const isActive = index === activeIndex;
          const isCompleted = index < activeIndex;

          return (
            <div key={item.name} className="flex items-center gap-4">
              {/* NODE */}
              <div
                className={cn(
                  "flex flex-col px-4 py-3 border rounded-none transition-all duration-500 min-w-[150px]",
                  isActive
                    ? "border-primary bg-primary/10 shadow-[0_0_24px_hsl(var(--primary)/0.25)]"
                    : isCompleted
                    ? "border-primary/40 bg-primary/5"
                    : "border-muted bg-muted/30"
                )}
              >
                <div className="flex items-center gap-2">
                  <item.icon
                    className={cn(
                      "w-5 h-5 transition-colors",
                      isActive || isCompleted
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  />
                  <span
                    className={cn(
                      "text-sm font-bold uppercase",
                      isActive || isCompleted
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {item.name}
                  </span>
                </div>

                <span className="text-xs text-muted-foreground mt-1">
                  {item.desc}
                </span>
              </div>

              {/* CONNECTION */}
              {index < PIPELINE.length - 1 && (
                <div
                  className={cn(
                    "h-[2px] w-10 transition-all duration-500",
                    isActive || isCompleted
                      ? "bg-primary"
                      : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
