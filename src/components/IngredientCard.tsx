import { X } from 'lucide-react';
import { motion } from 'framer-motion';

interface IngredientCardProps {
  name: string;
  onRemove: () => void;
}

const ingredientEmojis: Record<string, string> = {
  tomate: '🍅', cebola: '🧅', alho: '🧄', batata: '🥔', cenoura: '🥕',
  frango: '🍗', carne: '🥩', peixe: '🐟', arroz: '🍚', feijão: '🫘',
  ovo: '🥚', ovos: '🥚', leite: '🥛', queijo: '🧀', pão: '🍞',
  banana: '🍌', maçã: '🍎', limão: '🍋', laranja: '🍊', abacate: '🥑',
  milho: '🌽', brócolis: '🥦', alface: '🥬', pimentão: '🫑', pepino: '🥒',
  cogumelo: '🍄', camarão: '🦐', sal: '🧂', manteiga: '🧈', mel: '🍯',
  chocolate: '🍫', café: '☕', açúcar: '🍬', farinha: '🌾', massa: '🍝',
};

function getEmoji(name: string) {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(ingredientEmojis)) {
    if (lower.includes(key)) return emoji;
  }
  return '🥘';
}

const IngredientCard = ({ name, onRemove }: IngredientCardProps) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 shadow-sm"
    >
      <span className="text-xl">{getEmoji(name)}</span>
      <span className="text-sm font-medium text-card-foreground">{name}</span>
      <button
        onClick={onRemove}
        className="ml-auto rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
};

export default IngredientCard;
