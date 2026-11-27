import type { ReactNode } from 'react';

/** Page title in the home screen's style: a small mono eyebrow above a large display title. */
export function PageHeader({ eyebrow, title, children }: { eyebrow?: ReactNode; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-head">
      {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
      <h1 className="page-title">{title}</h1>
      {children}
    </header>
  );
}
