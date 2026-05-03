import { Sparkles } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCredits } from '@/hooks/useCredits';

export function CreditCounter() {
  const { user, loading: authLoading } = useAuth();
  const { remaining, total, loading } = useCredits();
  const location = useLocation();
  const hiddenPaths = ['/auth', '/privacy', '/terms'];
  const shouldHide = hiddenPaths.some((path) => location.pathname.startsWith(path));

  if (authLoading || !user || shouldHide) return null;

  const lowCredits = remaining <= 30;

  return (
    <div className="fixed right-3 top-3 z-50 rounded-full border border-border bg-card/95 px-3 py-2 text-xs font-semibold text-card-foreground shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex items-center gap-1.5">
        <Sparkles className={lowCredits ? 'h-3.5 w-3.5 text-destructive' : 'h-3.5 w-3.5 text-primary'} />
        <span className={lowCredits ? 'text-destructive' : ''}>
          {loading ? '...' : remaining}/{total} creditos
        </span>
      </div>
    </div>
  );
}
