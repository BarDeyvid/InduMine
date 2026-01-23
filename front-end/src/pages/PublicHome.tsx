import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { 
  HardHat, 
  ArrowRight,
  Database,
  Cpu,
  ShieldCheck,
  Zap,
  Globe,
  Settings2
} from "lucide-react";

const REAL_TECH_STACK = [
  { name: "ERP Sync", icon: Database, desc: "Integração nativa com SAP, Totvs e Oracle." },
  { name: "Edge Computing", icon: Cpu, desc: "Processamento local para minas offline." },
  { name: "Zero Trust", icon: ShieldCheck, desc: "Segurança de nível militar para dados sensíveis." },
  { name: "Real-time IoT", icon: Zap, desc: "Monitoramento de ativos em milissegundos." },
];

export default function PublicHome() {

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500">
      {/* Navbar Minimalista */}
      <nav className="container flex items-center justify-between py-8">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary rounded-lg">
            <HardHat className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-black tracking-tighter italic uppercase">InduMine</span>
        </div>
        
        <div className="flex items-center gap-6">
          <select 
            className="bg-transparent border border-muted px-2 py-1 rounded text-xs uppercase font-bold"
          >
            <option value="industrial">Industrial</option>
            <option value="emerald">Emerald</option>
          </select>
          <Button variant="ghost" className="font-bold uppercase tracking-widest text-xs" asChild>
            <Link to="/login">Entrar</Link>
          </Button>
        </div>
      </nav>

      <main className="container pt-16 pb-32">
        {/* Hero Section Figma Style */}
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-block px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-black uppercase tracking-[0.2em]">
            Heavy Industry Solutions v2.0
          </div>
          
          <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-[0.85] uppercase italic">
            Performance <br />
            <span className="text-primary not-italic text-[0.9em]">Sem Limites.</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
            A plataforma definitiva para gestão de catálogos técnicos e suprimentos em ambientes de alta complexidade.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-6">
            <Button size="lg" className="h-16 px-10 text-lg font-bold rounded-none skew-x-[-12deg]" asChild>
              <Link to="/register" className="inline-flex items-center skew-x-[12deg]">
                INICIAR OPERAÇÃO
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Tech Stack Real */}
        <div className="mt-40">
          <div className="flex items-center gap-4 mb-12">
            <div className="h-[2px] w-24 bg-primary" />
            <h2 className="text-sm font-black uppercase tracking-[0.3em]">Core Technologies</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {REAL_TECH_STACK.map((tech, idx) => (
              <Card key={idx} className="bg-muted/30 border-none rounded-none hover:bg-muted/50 transition-colors group">
                <CardContent className="p-8 space-y-6">
                  <tech.icon className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" />
                  <div className="space-y-2">
                    <h3 className="font-black uppercase italic text-lg">{tech.name}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{tech.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}