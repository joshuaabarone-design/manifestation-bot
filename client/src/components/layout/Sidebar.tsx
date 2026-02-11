import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Target, 
  Sparkles, 
  BookHeart, 
  Image as ImageIcon, 
  SquareUser, 
  LogOut,
  MoonStar,
  Settings,
  Sun,
  Brain
} from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();
  const { logout, user } = useAuth();

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/goals", label: "Goals", icon: Target },
    { href: "/affirmations", label: "Affirmations", icon: Sparkles },
    { href: "/journal", label: "Journal", icon: BookHeart },
    { href: "/vision-board", label: "Vision Board", icon: ImageIcon },
    { href: "/rituals", label: "Rituals", icon: Sun },
    { href: "/chat", label: "Advice", icon: SquareUser },
    { href: "/training", label: "Training", icon: Brain },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="h-screen w-64 bg-card/95 border-r border-border flex flex-col fixed left-0 top-0 z-50 shadow-2xl backdrop-blur-xl">
      <div className="p-6 flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-amber-400 to-purple-600 rounded-lg shadow-lg shadow-purple-500/20">
          <MoonStar className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-amber-500">
            Manifest
          </h1>
          <p className="text-xs text-muted-foreground">Soulful Planning</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href;
          return (
            <Link key={link.href} href={link.href} className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
              isActive 
                ? "text-white bg-primary/10 shadow-lg shadow-primary/5" 
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            )}>
              {isActive && (
                <div className="absolute inset-y-0 left-0 w-1 bg-primary rounded-r-full" />
              )}
              <Icon className={cn("h-5 w-5 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
              <span className="font-medium">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 mb-4 px-2">
          {user?.profileImageUrl ? (
             <img src={user.profileImageUrl} alt="Profile" className="w-10 h-10 rounded-full border border-primary/20" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold border border-primary/20">
              {user?.firstName?.[0] || user?.email?.[0] || "?"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'User'}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
