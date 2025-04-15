import { useStore } from '@nanostores/react';
import { Button } from '@ui/Button';
import { Sheet } from '@ui/Sheet';
import { toggleTheme } from '~/lib/stores/theme';
import { themeStore } from '~/lib/stores/theme';

export function ThemeCard() {
  const theme = useStore(themeStore);
  return (
    <Sheet>
      <h2 className="mb-4">Appearance</h2>
      <div className="flex items-center justify-between">
        <span className="text-content-secondary">Theme</span>
        <Button onClick={() => toggleTheme()}>{theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}</Button>
      </div>
    </Sheet>
  );
}
