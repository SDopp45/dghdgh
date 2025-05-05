import { Switch, Route } from "wouter";
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
import ProfileSettings from "./pages/settings/profile";
import NotificationsSettings from "./pages/settings/notifications";
import SecuritySettings from "./pages/settings/security";
import AppearanceSettings from "./pages/settings/appearance";
import LocalizationSettings from "./pages/settings/localization";
import DatesSettings from "./pages/settings/dates";
import ImageEnhancement from "./pages/image-enhancement";
import Marketplace from "./pages/marketplace";
import { Loader2 } from "lucide-react";
import AiChatBubble from "./components/ai-assistant/AiChatBubble";
import MainLayout from "./components/layout/MainLayout";
import ListingGenerator from "./pages/listing-generator";
import Links from "./pages/links";
import UserLinkPage from "./pages/u/[slug]";
import PDFExportsPage from "./pages/tools/pdf-exports";

function Router() {
  const { isLoading, user } = useUser();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
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
            <Route path="/settings/profile">
              <ProfileSettings />
            </Route>
            <Route path="/settings/notifications">
              <NotificationsSettings />
            </Route>
            <Route path="/settings/security">
              <SecuritySettings />
            </Route>
            <Route path="/settings/appearance">
              <AppearanceSettings />
            </Route>
            <Route path="/settings/localization">
              <LocalizationSettings />
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

// Public route for user link pages (outside of MainLayout)
function PublicRouter() {
  return (
    <Switch>
      <Route path="/u/:slug">
        <UserLinkPage />
      </Route>
      <Route path="*">
        <Router />
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PublicRouter />
      <Toaster />
    </QueryClientProvider>
  );
}