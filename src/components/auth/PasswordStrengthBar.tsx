import { cn } from '@utils/cn';

export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

export function getPasswordStrength(password: string): { strength: PasswordStrength; score: number; label: string } {
  if (!password) return { strength: 'weak', score: 0, label: '' };
  let score = 0;
  if (password.length >= 8)            score++;
  if (/[A-Z]/.test(password))          score++;
  if (/[0-9]/.test(password))          score++;
  if (/[^A-Za-z0-9]/.test(password))  score++;

  if (score <= 1) return { strength: 'weak',   score, label: 'Weak'   };
  if (score === 2) return { strength: 'fair',   score, label: 'Fair'   };
  if (score === 3) return { strength: 'good',   score, label: 'Good'   };
  return               { strength: 'strong', score, label: 'Strong' };
}

const STRENGTH_COLOR: Record<PasswordStrength, string> = {
  weak:   'bg-loss',
  fair:   'bg-brand-400',
  good:   'bg-cyan-500',
  strong: 'bg-gain',
};

const LABEL_COLOR: Record<PasswordStrength, string> = {
  weak:   'text-loss',
  fair:   'text-brand-300',
  good:   'text-cyan-400',
  strong: 'text-gain',
};

interface PasswordStrengthBarProps {
  password: string;
}

export function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
  const { strength, score, label } = getPasswordStrength(password);
  if (!password) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-all duration-300',
              i <= score ? STRENGTH_COLOR[strength] : 'bg-ink-700',
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className={cn('text-2xs font-medium', LABEL_COLOR[strength])}>{label}</span>
        {score < 4 && (
          <span className="text-2xs text-ink-400">
            {score === 0 && 'Add 8+ chars'}
            {score === 1 && 'Add uppercase or number'}
            {score === 2 && 'Add a special character'}
            {score === 3 && 'Add more variety'}
          </span>
        )}
      </div>
    </div>
  );
}
