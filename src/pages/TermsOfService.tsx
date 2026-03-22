import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useEffect } from 'react';

const TermsOfService = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  usePageTitle(t('terms.title'));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button 
            onClick={() => navigate(-1)} 
            className="rounded-full p-1.5 text-muted-foreground hover:bg-accent transition-colors"
            aria-label={t('common.cancel')}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">{t('terms.title')}</h1>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">1. {t('terms.acceptance')}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t('terms.acceptanceText')}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">2. {t('terms.services')}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t('terms.servicesText')}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">3. {t('terms.account')}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t('terms.accountText')}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">4. {t('terms.subscription')}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t('terms.subscriptionText')}
          </p>
          <ul className="list-disc list-inside mt-3 space-y-2 text-muted-foreground">
            <li>{t('terms.subBenefit1')}</li>
            <li>{t('terms.subBenefit2')}</li>
            <li>{t('terms.subBenefit3')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">5. {t('terms.usage')}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t('terms.usageText')}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">6. {t('terms.intellectual')}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t('terms.intellectualText')}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">7. {t('terms.privacy')}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t('terms.privacyText')}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">8. {t('terms.termination')}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t('terms.terminationText')}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">9. {t('terms.changes')}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t('terms.changesText')}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">10. {t('terms.contact')}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t('terms.contactText')}
          </p>
        </section>

        <footer className="pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground text-center">
            {t('terms.lastUpdated')}
          </p>
        </footer>
      </article>
    </main>
  );
};

export default TermsOfService;
