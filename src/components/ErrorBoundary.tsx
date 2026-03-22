import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('=== ERROR BOUNDARY ===');
    console.error('Error:', error);
    console.error('Info:', errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  handleReport = () => {
    const { error, errorInfo } = this.state;
    const report = `
Erro no Gastronom.IA:
${error?.message || 'Erro desconhecido'}
${error?.stack || ''}
Component: ${errorInfo?.componentStack || 'N/A'}
    `.trim();
    
    navigator.clipboard.writeText(report).catch(() => {});
    alert('Relatório copiado! Envie para: suporte@gastronomia.app');
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Algo deu errado</h1>
              <p className="text-muted-foreground text-sm">
                Ocorreu um erro inesperado. Tente novamente ou recarregue a pagina.
              </p>
              {this.state.error && (
                <details className="text-left bg-muted p-3 rounded-lg mt-4">
                  <summary className="text-xs font-mono cursor-pointer text-muted-foreground">
                    Detalhes tecnicos
                  </summary>
                  <pre className="text-xs text-destructive mt-2 overflow-auto max-h-32">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <Button onClick={() => window.location.reload()} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Recarregar pagina
              </Button>
              <Button variant="outline" onClick={this.handleReset} className="w-full">
                Voltar ao inicio
              </Button>
              <Button variant="ghost" size="sm" onClick={this.handleReport} className="w-full">
                <Bug className="w-4 h-4 mr-2" />
                Reportar erro
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
