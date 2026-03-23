import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Loader2 } from 'lucide-react'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Redireciona para a home após o login bem-sucedido
        navigate('/')
      } else if (event === 'SIGNED_OUT') {
        // Se por algum motivo o usuário deslogar aqui, volta para a tela de login
        navigate('/auth')
      }
    })

    // Limpa o listener quando o componente é desmontado
    return () => {
      subscription.unsubscribe()
    }
  }, [navigate])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#111', color: 'white' }}>
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p style={{ fontFamily: 'sans-serif', fontSize: '1rem' }}>Autenticando, aguarde...</p>
    </div>
  )
}
