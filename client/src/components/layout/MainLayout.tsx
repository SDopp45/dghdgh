import React, { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Settings, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { NotificationBell } from '@/components/ui/notifications/NotificationBell';
import { GlobalSearchBar } from '@/components/ui/GlobalSearchBar';

interface UserData {
  fullName?: string;
  email?: string;
  avatarUrl?: string;
  [key: string]: any;
}

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [location, setLocation] = useLocation();
  
  // Récupération des informations utilisateur
  const { data: user, isLoading, error } = useQuery<UserData>({
    queryKey: ['/api/user'],
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });
  
  // Redirection vers la page de connexion si l'utilisateur n'est pas connecté
  if (!isLoading && !user && !error && location !== '/login') {
    setLocation('/login');
    return null;
  }
  
  // Obtenir l'initiale du nom d'utilisateur pour l'avatar
  const getUserInitial = () => {
    if (!user?.fullName) return "U";
    return user.fullName.charAt(0).toUpperCase();
  };
  
  // Obtenir le titre de la page courante
  const getPageTitle = () => {
    switch (location) {
      case '/': return 'Tableau de bord';
      case '/properties': return 'Propriétés';
      case '/tenants': return 'Locataires';
      case '/tenant-history': return 'Système de notation';
      case '/visits': return 'Visites';
      case '/maintenance': return 'Maintenance';
      case '/finance': return 'Finances';
      case '/documents': return 'Documents';
      case '/links': return 'Liens';
      case '/marketplace': return 'Prestataires';
      case '/image-enhancement': return 'Amélioration d\'images';
      case '/listing-generator': return 'Générateur d\'annonces';
      case '/contracts/letters': return 'Modèles de lettres';
      case '/settings': return 'Paramètres';
      default: return '';
    }
  };
  
  return (
    <div className="flex min-h-screen bg-background">
      {/* Motif de grille en fond */}
      <div className="fixed inset-0 bg-grid-primary pointer-events-none z-0"></div>
      
      {/* Sidebar pour les écrans moyens et grands */}
      <div className="hidden md:block z-30 h-screen sticky top-0">
        <Sidebar />
      </div>
      
      {/* Sheet pour la sidebar mobile */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-[14px] left-4 z-50 text-[#70C7BA] hover:text-[#70C7BA] hover:bg-[#70C7BA]/10 h-8 w-8"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 max-w-[280px] bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))]">
            <Sidebar className="w-full border-0 shadow-none" />
          </SheetContent>
        </Sheet>
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Navigation */}
        <header className="sticky top-0 z-30 h-[72px] bg-white border-b border-[hsl(var(--sidebar-border))] flex items-center px-4 md:px-6">
          <div className="w-full flex items-center justify-between gap-2">
            {/* Ligne horizontale à mi-hauteur */}
            <div className="absolute left-0 right-0 h-[1px] bg-[hsl(var(--sidebar-border))] top-1/2 opacity-30"></div>
            
            {/* Titre de la page courante (responsive) */}
            <div className="w-14 md:w-auto md:ml-2 flex items-center">
              <h1 className="text-lg font-semibold text-foreground hidden md:block">
                {getPageTitle()}
              </h1>
            </div>
            
            {/* Barre de recherche */}
            <div className="flex-1 max-w-[200px] sm:max-w-[280px] md:max-w-[320px] lg:max-w-[400px] mx-auto">
              <GlobalSearchBar />
            </div>
            
            {/* Actions utilisateur */}
            <div className="flex items-center gap-1.5">
              <NotificationBell />
              
              {/* Theme Toggle */}
              <ThemeToggle 
                variant="icon" 
                className="h-8 w-8 text-[#70C7BA] hover:text-[#70C7BA] hover:bg-[#70C7BA]/10" 
              />
              
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "rounded-full h-8 w-8 hover:bg-[#70C7BA]/10",
                  location === '/settings' 
                    ? "bg-[#70C7BA]/10 text-[#70C7BA]" 
                    : "text-[#70C7BA] hover:text-[#70C7BA]"
                )}
                onClick={() => setLocation('/settings')}
              >
                <Settings className="h-5 w-5" />
              </Button>
              
              {user && (
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-2 px-2 rounded-full hover:bg-[#70C7BA]/10 h-7"
                >
                  <Avatar className="h-7 w-7 border-2 border-[#70C7BA]/30">
                    <AvatarImage src={user.avatarUrl} />
                    <AvatarFallback className="bg-[#70C7BA] text-white text-xs">
                      {getUserInitial()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground hidden md:inline-block">
                    {user.fullName || "Utilisateur"}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </header>
        
        {/* Contenu principal */}
        <main className="flex-1 overflow-auto relative z-10">
          <div className="container py-6 md:py-8 w-full max-w-full px-4 md:px-6">
            <div className="flex-1 space-y-4 p-8 pt-6">
              <div className="mb-4 gap-3">
                {children}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;