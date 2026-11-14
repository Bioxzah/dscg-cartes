import type { CSSProperties } from 'react';
import type { ThemeColor } from '../cards/types.ts';

/** Exposes a theme's color as --accent / --accent-soft for its subtree. */
export function themeStyle(couleur: ThemeColor): CSSProperties {
  return { '--accent': `var(--${couleur})`, '--accent-soft': `var(--${couleur}-soft)` } as CSSProperties;
}
