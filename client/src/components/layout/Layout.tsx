import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { MobileHeader } from "./MobileHeader";
import { motion } from "framer-motion";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      
      {/* Mobile Header */}
      <MobileHeader />
      
      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen relative overflow-hidden pb-20 lg:pb-0">
        <div className="absolute inset-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
        <div className="relative z-10 p-4 lg:p-8 max-w-7xl mx-auto pt-16 lg:pt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </div>
      </main>
      
      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
