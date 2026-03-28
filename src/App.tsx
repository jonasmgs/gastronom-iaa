import { useEffect, lazy, Suspense } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Toaster } from "@/components/ui/toaster";
import { InstallPrompt } from '@/components/InstallPrompt';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from '@/hooks/useAuth';
import { initTheme } from '@/lib/theme';
import SubscriptionPopup from '@/components/SubscriptionPopup';
import { ErrorBoundary } from "./components/ErrorBoundary";
import { inject } from '@vercel/analytics';

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const MyRecipes = lazy(() => import("./pages/MyRecipes"));
const ShoppingList = lazy(() => import("./pages/ShoppingList"));
const Ingredients = lazy(() => import("./pages/Ingredients"));
const RecipeResult = lazy(() => import("./pages/RecipeResult"));
const EditRecipe = lazy(() => import("./pages/EditRecipe"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const ShareHandler = lazy(() => import("./pages/ShareHandler"));

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

inject();

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const AppRoutes = () => {
  const { session } = useAuth();
  useEffect(() => { initTheme(); }, []);

  useEffect(() => {
    // Register Periodic Background Sync
    const registerPeriodicSync = async () => {
      if ('serviceWorker' in navigator && 'PeriodicSyncManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          
          // Check if periodic sync is supported and registered
          const tags = await (registration as any).periodicSync.getTags();
          
          if (!tags.includes('sync-recipes')) {
            await (registration as any).periodicSync.register('sync-recipes', {
              minInterval: 86400, // 24 hours
            });
            console.log('[App] Periodic Sync registered');
          }
        } catch (error) {
          console.log('[App] Periodic Sync not available:', error);
        }
      }
    };

    registerPeriodicSync();

    // Listen for messages from service worker
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'BACKGROUND_SYNC_COMPLETE') {
        console.log('[App] Background sync completed at', new Date(event.data.timestamp));
      }
      if (event.data?.type === 'PERIODIC_SYNC') {
        console.log('[App] Periodic sync triggered at', new Date(event.data.timestamp));
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    // Configurar o listener para URLs de redirecionamento (Deep Links) do Capacitor
    const handleDeepLink = async () => {
      CapApp.addListener('appUrlOpen', (event: any) => {
        const url = new URL(event.url);
        const path = url.pathname + url.search + url.hash;
        console.log('App opened with URL:', event.url);
      });
    };

    handleDeepLink();
    return () => {
      CapApp.removeAllListeners();
    };
  }, []);

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/recipes" element={<ProtectedRoute><MyRecipes /></ProtectedRoute>} />
          <Route path="/recipe/:id" element={<ProtectedRoute><RecipeResult /></ProtectedRoute>} />
          <Route path="/recipe/edit/:id" element={<ProtectedRoute><EditRecipe /></ProtectedRoute>} />
          <Route path="/shopping-list" element={<ProtectedRoute><ShoppingList /></ProtectedRoute>} />
          <Route path="/ingredients" element={<ProtectedRoute><Ingredients /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/share" element={<ShareHandler />} />
          <Route path="/sucesso" element={<Navigate to="/settings?checkout=success" replace />} />
          <Route path="/planos" element={<Navigate to="/settings?checkout=cancel" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
        <SubscriptionPopup />
        <InstallPrompt />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
