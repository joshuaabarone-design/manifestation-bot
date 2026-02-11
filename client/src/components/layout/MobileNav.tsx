import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Target, 
  Sparkles, 
  BookHeart, 
  Image as ImageIcon, 
  MessageCircle
} from "lucide-react";

export function MobileNav() {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Home", icon: LayoutDashboard },
    { href: "/goals", label: "Goals", icon: Target },
    { href: "/affirmations", label: "Affirm", icon: Sparkles },
    { href: "/journal", label: "Journal", icon: BookHeart },
    { href: "/vision-board", label: "Vision", icon: ImageIcon },
    { href: "/chat", label: "Advice", icon: MessageCircle },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-area-bottom lg:hidden">
      <div className="flex justify-around items-center h-16 px-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href;
          return (
            <Link 
              key={link.href} 
              href={link.href} 
              data-testid={`nav-${link.label.toLowerCase()}`}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-lg transition-all min-w-[52px]",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span className="text-[10px] font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
