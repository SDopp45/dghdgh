import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocation } from "wouter";
import { Building2, Users, Wrench, LayoutDashboard, LogOut, Wallet, Settings, Image, ShoppingBag, CalendarRange, Library, Star, ChevronRight, Home, FileText, ChevronLeft, Link2 } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { NotificationBell } from "@/components/ui/notifications/NotificationBell";
import { useQuery } from "@tanstack/react-query";
import { AuthAnimation } from "@/components/ui/auth-animation";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LucideIcon } from "lucide-react";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

interface SubMenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  subMenu?: SubMenuItem[];
}

interface MenuItem {
  href?: string;
  id?: string;
  label: string;
  icon: LucideIcon;
  subMenu?: SubMenuItem[];
}

export function Sidebar({ className }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { logout, isLoggingOut } = useUser();
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const { data: currentUser } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const response = await fetch("/api/user");
      if (!response.ok) {
        if (response.status === 401) return null;
        throw new Error("Failed to fetch user");
      }
      return response.json();
    },
  });

  const links: MenuItem[] = [
    { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/properties", label: "Propriétés", icon: Building2 },
    { href: "/visits", label: "Visites", icon: CalendarRange },
    {
      id: "tenants",
      label: "Locataires",
      icon: Users,
      subMenu: [
        { href: "/tenants", label: "Liste des locataires", icon: Users },
        { href: "/tenant-history", label: "Système de notation", icon: Star }
      ]
    },
    { href: "/maintenance", label: "Maintenance", icon: Wrench },
    { href: "/finance", label: "Finances", icon: Wallet },
    { href: "/marketplace", label: "Prestataires", icon: ShoppingBag },
    {
      id: "documents",
      label: "Documents et Lettres",
      icon: Library,
      subMenu: [
        { href: "/documents", label: "Documents", icon: Library },
        { href: "/contracts/letters", label: "Modèles de lettres", icon: FileText }
      ]
    },
    {
      id: "tools",
      label: "Outils",
      icon: Image,
      subMenu: [
        { href: "/image-enhancement", label: "Amélioration d'Images", icon: Image },
        { href: "/listing-generator", label: "Générateur d'Annonces", icon: FileText },
        { href: "/links", label: "Liens", icon: Link2 },
      ],
    }
  ];

  // Vérifier si un sous-menu doit être ouvert basé sur la location actuelle
  useEffect(() => {
    const menuToOpen = links.find(link => 
      link.subMenu?.some(subItem => subItem.href === location) && link.id
    )?.id;
    
    if (menuToOpen && !openMenus.includes(menuToOpen)) {
      setOpenMenus(prev => [...prev, menuToOpen]);
    }
  }, [location, links, openMenus]);

  // Toggle d'un sous-menu
  const toggleSubMenu = (id: string) => {
    setOpenMenus(prev => 
      prev.includes(id) 
        ? prev.filter(menuId => menuId !== id) 
        : [...prev, id]
    );
  };
  
  // Récupérer l'initiale de l'utilisateur pour l'avatar
  const getUserInitial = () => {
    if (!currentUser?.fullName) return "U";
    return currentUser.fullName.charAt(0).toUpperCase();
  };

  const toggleCollapsed = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    
    // Émettre un événement personnalisé pour informer le MainLayout
    const event = new CustomEvent('sidebarCollapse', { 
      detail: { collapsed: newCollapsedState } 
    });
    window.dispatchEvent(event);
  };

  // Lors du changement initial, émettre l'événement une fois
  useEffect(() => {
    const event = new CustomEvent('sidebarCollapse', { 
      detail: { collapsed: isCollapsed } 
    });
    window.dispatchEvent(event);
  }, []);

  return (
    <div
      className={cn(
        "flex flex-col h-screen border-r bg-white border-[hsl(var(--sidebar-border))] transition-all duration-300 ease-in-out overflow-hidden",
        isCollapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Header avec logo */}
      <div className="px-5 py-5 border-b border-[hsl(var(--sidebar-border))] bg-white">
        <div className="flex items-center justify-between">
          <div className={cn(
            "flex items-center",
            isCollapsed ? "justify-center w-full" : "justify-start"
          )}>
            {isCollapsed ? (
              <img 
                src="/images/logos/Logo.svg" 
                alt="Gestiobien Logo" 
                className="h-8 w-8 object-contain filter drop-shadow-[0_0_1px_rgba(0,0,0,0.7)] dark:drop-shadow-[0_0_1px_rgba(255,255,255,0.7)] dark:invert dark:brightness-200" 
              />
            ) : (
              <div className="flex items-center gap-2">
                <img 
                  src="/images/logos/Logo.svg" 
                  alt="Gestiobien Logo" 
                  className="h-8 w-8 object-contain filter drop-shadow-[0_0_1px_rgba(0,0,0,0.7)] dark:drop-shadow-[0_0_1px_rgba(255,255,255,0.7)] dark:invert dark:brightness-200" 
                />
                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-[#70C7BA] to-[#49EACB] bg-clip-text text-transparent">
                  Gestiobien
                </span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hidden md:flex"
            onClick={toggleCollapsed}
          >
            <ChevronLeft className={cn(
              "h-4 w-4 transition-transform duration-300",
              isCollapsed && "rotate-180"
            )} />
          </Button>
        </div>
      </div>
      
      {/* Navigation */}
      <ScrollArea className="flex-1 py-6 px-3 bg-white">
        <nav className="space-y-1">
          {links.map((link) => (
            <div key={link.href || link.id} className="mb-2">
              {link.subMenu ? (
                <div>
                  {!isCollapsed ? (
                    <>
                      <Button
                        variant="ghost"
                        onClick={() => link.id && toggleSubMenu(link.id)}
                        className={cn(
                          "menu-item w-full justify-between items-center px-3 py-2.5 text-[hsl(var(--sidebar-foreground))]/80 rounded-lg group bg-white",
                          "hover:bg-[#70C7BA]/10 hover:text-[#70C7BA] transition-all duration-200"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <link.icon className="h-5 w-5 text-[hsl(var(--sidebar-foreground))]/70 group-hover:text-[#70C7BA] transition-colors" />
                          <span className="font-medium">{link.label}</span>
                        </div>
                        <ChevronRight className={cn(
                          "h-4 w-4 text-[hsl(var(--sidebar-foreground))]/50 transition-transform duration-200 ease-out",
                          openMenus.includes(link.id || "") && "transform rotate-90"
                        )} />
                      </Button>
                      
                      {openMenus.includes(link.id || "") && (
                        <div className="pl-10 space-y-1 pt-1 overflow-hidden transition-all duration-200 ease-in-out bg-white">
                          {link.subMenu.map((subItem) => (
                            <Button
                              key={subItem.href}
                              variant="ghost"
                              className={cn(
                                "submenu-item w-full justify-start gap-2 text-sm font-medium px-3 py-2 rounded-lg",
                                location === subItem.href
                                  ? "bg-[#70C7BA]/20 text-[#70C7BA]"
                                  : "text-[hsl(var(--sidebar-foreground))]/80 hover:bg-[#70C7BA]/10 hover:text-[#70C7BA]"
                              )}
                              onClick={() => setLocation(subItem.href)}
                            >
                              <subItem.icon className={cn(
                                "h-4 w-4",
                                location === subItem.href ? "text-[#70C7BA]" : "text-[hsl(var(--sidebar-foreground))]/70"
                              )} />
                              {subItem.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            className={cn(
                              "menu-item w-full justify-center px-3 py-2.5 text-[hsl(var(--sidebar-foreground))]/80 rounded-lg group bg-white",
                              "hover:bg-[#70C7BA]/10 hover:text-[#70C7BA] transition-all duration-200"
                            )}
                          >
                            <link.icon className="h-5 w-5 text-[hsl(var(--sidebar-foreground))]/70 group-hover:text-[#70C7BA] transition-colors" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="right" 
                          sideOffset={10} 
                          className="p-0 bg-white border rounded-lg shadow-lg"
                          onPointerDownOutside={(e) => e.preventDefault()}
                        >
                          <div className="py-2 px-2 min-w-[180px]">
                            <p className="px-2 py-1 text-sm font-medium text-[hsl(var(--sidebar-foreground))]/70 mb-1">{link.label}</p>
                            <div className="space-y-1">
                              {link.subMenu.map((subItem) => (
                                <Button
                                  key={subItem.href}
                                  variant="ghost"
                                  className={cn(
                                    "w-full justify-start gap-2 text-sm px-2 py-1.5 rounded-md",
                                    location === subItem.href
                                      ? "bg-[#70C7BA]/20 text-[#70C7BA]"
                                      : "text-[hsl(var(--sidebar-foreground))]/80 hover:bg-[#70C7BA]/10 hover:text-[#70C7BA]"
                                  )}
                                  onClick={() => {
                                    setLocation(subItem.href);
                                  }}
                                >
                                  <subItem.icon className={cn(
                                    "h-4 w-4",
                                    location === subItem.href ? "text-[#70C7BA]" : "text-[hsl(var(--sidebar-foreground))]/70"
                                  )} />
                                  {subItem.label}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              ) : (
                <TooltipProvider key={link.href}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "menu-item w-full flex items-center px-3 py-3 text-[hsl(var(--sidebar-foreground))]/80 rounded-lg bg-white",
                          "hover:bg-[#70C7BA]/10 hover:text-[#70C7BA] transition-all duration-200",
                          location === link.href && "bg-[#70C7BA]/20 text-[#70C7BA]",
                          isCollapsed ? "justify-center" : "justify-start gap-3"
                        )}
                        onClick={() => setLocation(link.href || "")}
                      >
                        <link.icon className={cn(
                          "h-5 w-5 flex-shrink-0",
                          location === link.href ? "text-[#70C7BA]" : "text-[hsl(var(--sidebar-foreground))]/70"
                        )} />
                        {!isCollapsed && <span className="font-medium">{link.label}</span>}
                      </Button>
                    </TooltipTrigger>
                    {isCollapsed && (
                      <TooltipContent side="right">
                        <p>{link.label}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>
      
      {/* Footer */}
      <div className="border-t border-[hsl(var(--sidebar-border))] p-4 bg-white">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-[hsl(var(--sidebar-foreground))]/80 hover:text-[#70C7BA] bg-white"
          onClick={logout}
          disabled={isLoggingOut}
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span>Déconnexion</span>}
        </Button>
      </div>
    </div>
  );
}