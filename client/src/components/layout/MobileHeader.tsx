import { useAuth } from "@/hooks/use-auth";
import { MoonStar, LogOut, Menu, Settings, Sun, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MobileHeader() {
  const { user, logout, isAdmin } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border h-[calc(3.5rem+env(safe-area-inset-top))] flex items-center justify-between px-4 lg:hidden safe-area-top">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-gradient-to-br from-amber-400 to-purple-600 rounded-lg">
          <MoonStar className="h-5 w-5 text-white" />
        </div>
        <span className="font-display text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-amber-500">
          Manifest
        </span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9" data-testid="button-mobile-menu" aria-label="Open menu">
            {user?.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="Profile" className="w-8 h-8 rounded-full" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'User'}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <DropdownMenuSeparator />
          {/* Rituals is not in the bottom tab bar, so it lives here on phones. */}
          <DropdownMenuItem asChild>
            <Link href="/rituals" className="flex items-center cursor-pointer" data-testid="menu-rituals">
              <Sun className="mr-2 h-4 w-4" />
              Rituals
            </Link>
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem asChild>
              <Link href="/training" className="flex items-center cursor-pointer">
                <Brain className="mr-2 h-4 w-4" />
                Training (admin)
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href="/settings" className="flex items-center cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
