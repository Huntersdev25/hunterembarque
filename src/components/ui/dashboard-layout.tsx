import { ReactNode, memo } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
  userType: "candidate" | "admin" | "client";
  darkMode?: boolean;
}

export const DashboardLayout = memo(function DashboardLayout({ children, userType, darkMode = false }: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className={cn(
        "min-h-screen flex w-full max-w-full overflow-x-hidden transition-colors duration-300",
        darkMode ? "bg-[#0a1628]" : "bg-maritime-mist"
      )}>
        <AppSidebar userType={userType} darkMode={darkMode} />
        
        <div className="flex-1 flex min-w-0 flex-col max-w-full overflow-x-hidden">
          {/* Header com trigger do sidebar */}
          <header className={cn(
            "h-12 sm:h-14 flex items-center border-b px-2 sm:px-4 sticky top-0 z-40 transition-colors duration-300",
            darkMode 
              ? "bg-[#0a1628] border-gray-800/50" 
              : "bg-card border-border"
          )}>
            <SidebarTrigger className={cn("mr-2", darkMode && "text-white hover:bg-gray-800")} />
            <h1 className={cn(
              "text-xs sm:text-sm lg:text-base font-semibold transition-colors duration-300",
              darkMode ? "text-cyan-400" : "text-maritime-blue"
            )}>
              {darkMode ? "Hunters.IO" : "Hunters Manpower"}
            </h1>
          </header>

          {/* Main content */}
          <main className={cn(
            "flex-1 min-w-0 max-w-full overflow-x-hidden overflow-y-auto transition-colors duration-300",
            darkMode ? "p-0" : "p-0 sm:p-4 lg:p-6"
          )}>
            <div className={cn(
              "w-full min-w-0 max-w-full overflow-x-hidden",
              !darkMode && "max-w-7xl mx-auto"
            )}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
});