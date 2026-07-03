import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Input } from '@components/ui';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  hint?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label = 'Password', ...rest }, ref) => {
    const [visible, setVisible] = useState(false);
    return (
      <Input
        ref={ref}
        label={label}
        type={visible ? 'text' : 'password'}
        leftIcon={<Lock size={15} />}
        rightSlot={
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setVisible((v) => !v)}
            className="p-1 text-ink-400 hover:text-ink-200 transition-colors"
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            {visible ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        }
        {...rest}
      />
    );
  }
);
PasswordInput.displayName = 'PasswordInput';
