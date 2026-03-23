import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Play, Pause, Clock, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Step, Ingredient } from '@/types/recipe';

interface CookingModeProps {
  recipeName: string;
  steps: Step[];
  ingredients: Ingredient[];
  onClose: () => void;
}

const CookingMode = ({ recipeName, steps, ingredients, onClose }: CookingModeProps) => {
  const { t } = useTranslation();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [view, setView] = useState<'ingredients' | 'steps'>('ingredients');

  const currentStep = steps[currentStepIndex];

  // Prevent sleep if possible (standard web API)
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.error('Wake Lock request failed:', err);
      }
    };
    requestWakeLock();
    return () => {
      if (wakeLock) wakeLock.release();
    };
  }, []);

  const handleNext = () => {
    if (view === 'ingredients') {
      setView('steps');
    } else if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (view === 'steps' && currentStepIndex === 0) {
      setView('ingredients');
    } else if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-12 pb-4 border-b">
        <div className="flex-1">
          <p className="text-xs font-bold text-primary uppercase tracking-widest">{t('recipe.cookingMode')}</p>
          <h1 className="text-sm font-bold text-foreground line-clamp-1">{recipeName}</h1>
        </div>
        <button
          onClick={onClose}
          className="h-10 w-10 flex items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          {view === 'ingredients' ? (
            <motion.div
              key="ingredients"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full space-y-6"
            >
              <h2 className="text-2xl font-bold text-foreground mb-8">{t('recipe.ingredients')}</h2>
              <ul className="space-y-4 text-left max-w-md mx-auto">
                {ingredients.map((ing, i) => (
                  <li key={i} className="flex items-start gap-3 text-lg text-foreground/90 bg-muted/30 p-4 rounded-2xl">
                    <div className="h-6 w-6 mt-1 rounded-full border-2 border-primary/30 flex-shrink-0" />
                    <span>
                      <strong className="text-primary">{ing.name}</strong> — {ing.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ) : (
            <motion.div
              key={currentStepIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full space-y-8 max-w-2xl"
            >
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground text-3xl font-black mb-4 shadow-lg shadow-primary/20">
                {currentStep.step_number}
              </div>
              
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-foreground px-4">{currentStep.title}</h3>
                <div className="flex items-center justify-center gap-4">
                  {currentStep.duration && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-bold">
                      <Clock className="h-4 w-4" /> {currentStep.duration}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-2xl leading-relaxed text-foreground/90 font-medium px-2">
                {currentStep.description}
              </p>

              {currentStep.tip && (
                <div className="bg-primary/10 border border-primary/20 p-6 rounded-3xl text-left">
                  <p className="text-primary font-bold text-sm uppercase mb-2">💡 {t('recipe.tip')}</p>
                  <p className="text-lg text-primary/90 italic font-medium">{currentStep.tip}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      <footer className="px-6 py-8 border-t bg-card/50 backdrop-blur-md">
        <div className="flex items-center justify-between gap-4 max-w-md mx-auto">
          <button
            onClick={handleBack}
            disabled={view === 'ingredients'}
            className="flex-1 h-16 flex items-center justify-center gap-2 rounded-2xl border-2 border-border bg-background text-foreground font-bold disabled:opacity-30 transition-all active:scale-95"
          >
            <ChevronLeft className="h-6 w-6" />
            {t('common.back')}
          </button>
          
          <button
            onClick={handleNext}
            className={`flex-[2] h-16 flex items-center justify-center gap-2 rounded-2xl font-bold shadow-lg transition-all active:scale-95 ${
              view === 'steps' && currentStepIndex === steps.length - 1
                ? 'bg-green-600 text-white'
                : 'bg-primary text-primary-foreground'
            }`}
          >
            {view === 'steps' && currentStepIndex === steps.length - 1 ? (
              <>
                <CheckCircle2 className="h-6 w-6" />
                {t('common.finish')}
              </>
            ) : (
              <>
                {t('common.next')}
                <ChevronRight className="h-6 w-6" />
              </>
            )}
          </button>
        </div>
        
        {/* Progress Bar */}
        {view === 'steps' && (
          <div className="mt-6 h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
              className="h-full bg-primary"
            />
          </div>
        )}
      </footer>
    </motion.div>
  );
};

export default CookingMode;
