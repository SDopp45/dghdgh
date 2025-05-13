import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { useUser } from "./hooks/use-user";
import { useEffect } from "react";
import { webSocketService } from "./lib/websocket";
import NotFound from "./pages/not-found";
import AuthPage from "./pages/auth-page";
import Dashboard from "./pages/dashboard";
import Properties from "./pages/properties";
import Tenants from "./pages/tenants";
import TenantHistory from "./pages/tenant-history";
import Maintenance from "./pages/maintenance";
import Visits from "./pages/visits";
import NewVisit from "./pages/visits/new";
import Finance from "./pages/finance";
import Documents from "./pages/documents";
import Contracts from "./pages/contracts";
import ContractLetters from "./pages/contracts/letters";
import DocumentEdit from "./pages/documents/[id]/edit";
import Settings from "./pages/settings";
import AccountSettings from "./pages/settings/account";
import SecuritySettings from "./pages/settings/security";
import UserDashboard from "./pages/settings/user-dashboard";
import StorageSettings from "./pages/settings/storage";
import StoragePlansSettings from "./pages/settings/storage/plans";
import AITokensSettings from "./pages/settings/ai-tokens";
import ImageEnhancement from "./pages/image-enhancement";
import Marketplace from "./pages/marketplace";
import { Loader2 } from "lucide-react";
import AiChatBubble from "./components/ai-assistant/AiChatBubble";
import MainLayout from "./components/layout/MainLayout";
import ListingGenerator from "./pages/listing-generator";
import Links from "./pages/links";
import UserLinkPage from "./pages/u/[slug]";
import PDFExportsPage from "./pages/tools/pdf-exports";

// Protected Router Component
function ProtectedRouter() {
  const { isLoading, user } = useUser();
  const [location, setLocation] = useLocation();
  
  // Effect to redirect to login if no user
  useEffect(() => {
    if (!isLoading && !user && location !== "/login") {
      console.log("Utilisateur non authentifié, redirection vers /login");
      setLocation("/login");
    }
  }, [isLoading, user, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  // If not authenticated, don't render any protected routes
  if (!user) {
    return null;
  }

  return (
    <>
      <MainLayout>
        <QueryClientProvider client={queryClient}>
          <Switch>
            <Route path="/">
              <Dashboard />
            </Route>
            <Route path="/tenants">
              <Tenants />
            </Route>
            <Route path="/properties">
              <Properties />
            </Route>
            <Route path="/finance">
              <Finance />
            </Route>
            <Route path="/messages">
              <span>Messages</span>
            </Route>
            <Route path="/documents">
              <Documents />
            </Route>
            <Route path="/contracts/letters">
              <ContractLetters />
            </Route>
            <Route path="/settings">
              <Settings />
            </Route>
            <Route path="/settings/account">
              <AccountSettings />
            </Route>
            <Route path="/settings/security">
              <SecuritySettings />
            </Route>
            <Route path="/settings/user-dashboard">
              <UserDashboard />
            </Route>
            <Route path="/settings/storage">
              <StorageSettings />
            </Route>
            <Route path="/settings/storage/plans">
              <StoragePlansSettings />
            </Route>
            <Route path="/settings/ai-tokens">
              <AITokensSettings />
            </Route>
            <Route path="/tenant-history">
              <TenantHistory />
            </Route>
            <Route path="/visits">
              <Visits />
            </Route>
            <Route path="/visits/new">
              <NewVisit />
            </Route>
            <Route path="/maintenance">
              <Maintenance />
            </Route>
            <Route path="/documents/:id/edit">
              <DocumentEdit />
            </Route>
            <Route path="/image-enhancement">
              <ImageEnhancement />
            </Route>
            <Route path="/listing-generator">
              <ListingGenerator />
            </Route>
            <Route path="/tools/pdf-exports">
              <PDFExportsPage />
            </Route>
            <Route path="/marketplace">
              <Marketplace />
            </Route>
            <Route path="/links">
              <Links />
            </Route>
            <Route>
              <Dashboard />
            </Route>
          </Switch>
        </QueryClientProvider>
      </MainLayout>
      <AiChatBubble />
    </>
  );
}

// Main Router - Handles both protected and public routes
function MainRouter() {
  const { isLoading, user } = useUser();
  const [location, setLocation] = useLocation();

  // Rediriger automatiquement vers le dashboard si l'utilisateur est connecté et se trouve sur /login
  useEffect(() => {
    if (user && location === "/login") {
      setLocation("/");
    }
  }, [user, location, setLocation]);

  return (
    <Switch>
      <Route path="/login">
        {user ? <Dashboard /> : <AuthPage />}
      </Route>
      <Route path="/u/:slug">
        <UserLinkPage />
      </Route>
      <Route path="*">
        <ProtectedRouter />
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainRouter />
      <Toaster />
    </QueryClientProvider>
  );
}