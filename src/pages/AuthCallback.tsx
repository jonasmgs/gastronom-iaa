import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    // 1. Capturar erros tanto da Query String (?) quanto do Hash (#)
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    const error = params.get('error') || hashParams.get('error');
    const errorDescription = params.get('error_description') || hashParams.get('error_description');

    if (error) {
      console.error('[AuthCallback] Erro detectado:', error, errorDescription);
      toast.error(`Erro: ${errorDescription || error}`);
      navigate('/auth', { replace: true });
      return;
    }

    // 2. Tentar processar a sessão
    const handleAuth = async () => {
      try {
        console.log('[AuthCallback] Processando autenticação...');
        
        // Pequena espera para garantir que o cliente Supabase processou o código da URL
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (session) {
          console.log('[AuthCallback] Sessão obtida com sucesso:', session.user.email);
          toast.success('Bem-vindo!');
          navigate('/', { replace: true });
        } else {
          // Se não houver sessão imediata, aguardamos o evento SIGNED_IN
          console.log('[AuthCallback] Sem sessão imediata, aguardando evento...');
        }
      } catch (err: any) {
        console.error('[AuthCallback] Erro crítico:', err);
        toast.error('Falha ao processar login. Tente novamente.');
        navigate('/auth', { replace: true });
      }
    };

    handleAuth();

    // 3. Listener para eventos de mudança de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthCallback] Evento de Auth:', event);
      if (event === 'SIGNED_IN' && session) {
        navigate('/', { replace: true });
      } else if (event === 'INITIAL_SESSION' && session) {
        navigate('/', { replace: true });
      }
    });

    return () => {
      subscription.unsubscribe();
    }
  }, [navigate])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#111', color: 'white' }}>
      <Loader2 className="h-10 w-10 animate-spin text-primary mb-6" />
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'sans-serif', fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Finalizando login</h2>
        <p style={{ fontFamily: 'sans-serif', fontSize: '0.9rem', color: '#999' }}>Autenticando sua conta, aguarde um instante...</p>
      </div>
    </div>
  )
}
