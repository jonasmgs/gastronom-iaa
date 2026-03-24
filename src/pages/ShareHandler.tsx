import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

const ShareHandler = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const title = searchParams.get('title') || '';
    const text = searchParams.get('text') || '';
    const url = searchParams.get('url') || '';

    if (title || text || url) {
      const content = title || text || url;
      localStorage.setItem('shared_recipe_content', content);
      toast.success('Conteúdo recebido! Usando na geração...');
    }

    navigate('/');
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Processando...</p>
    </div>
  );
};

export default ShareHandler;
