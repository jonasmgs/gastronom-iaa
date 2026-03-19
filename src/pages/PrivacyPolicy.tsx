import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  usePageTitle('Politica de privacidade');

  return (
    <main className="min-h-screen bg-background pb-10" role="main">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 ios-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-accent"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Politica de privacidade</h1>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <p className="font-semibold text-foreground">Como o Gastronom.IA trata seus dados</p>
          </div>

          <div className="space-y-4 text-sm leading-6 text-muted-foreground">
            <p>
              O Gastronom.IA coleta os dados minimos necessarios para autenticar sua conta, salvar receitas,
              personalizar sugestoes e oferecer recursos premium.
            </p>

            <p>
              Dados que podem ser armazenados: nome, email, receitas salvas, preferencias de uso e informacoes
              nutricionais fornecidas por voce, como idade, sexo, altura, peso, objetivo alimentar e alergias.
            </p>

            <p>
              As receitas e mensagens enviadas para recursos de IA podem ser processadas pelos provedores
              configurados pelo app para gerar respostas culinarias. Dados de pagamento sao processados pela Stripe.
            </p>

            <p>
              O app usa Supabase para autenticacao e banco de dados. Informacoes de pagamento podem ser mantidas
              por obrigacoes legais, fiscais e de prevencao a fraude, mesmo apos a exclusao da conta, quando isso
              for exigido pelo provedor de pagamento.
            </p>

            <p>
              Voce pode solicitar a exclusao da sua conta diretamente no app, na tela de Configuracoes.
              A exclusao remove seus dados principais do aplicativo, incluindo perfil, receitas e perfil nutricional.
            </p>

            <p>
              Para publicacao na Play Store, publique esta mesma politica em um dominio oficial do app e use o link
              publico no Google Play Console.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};

export default PrivacyPolicy;
