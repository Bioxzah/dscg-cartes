import type { CSSProperties } from 'react';
import type { UeNode } from '../cards/catalog.ts';

const UE_COLORS = ['violet', 'sarcelle', 'bleu', 'vert', 'rouge', 'ardoise'] as const;

/** One color per UE, in catalog order, exposed as --c / --cs for its subtree. */
export function ueStyle(tree: readonly UeNode[], ue: string): CSSProperties {
  const i = Math.max(0, tree.findIndex((u) => u.ue === ue));
  const color = UE_COLORS[i % UE_COLORS.length] ?? 'bleu';
  return { '--c': `var(--${color})`, '--cs': `var(--${color}-soft)` } as CSSProperties;
}

/** "UE1" → "UE 1" */
export const ueLabel = (ue: string) => ue.replace(/^UE\s*/, 'UE ');
