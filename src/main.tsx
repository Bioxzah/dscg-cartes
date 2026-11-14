import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/bricolage-grotesque/700.css';
import '@fontsource/bricolage-grotesque/800.css';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import '@fontsource/ibm-plex-mono/500.css';
import '../docs/design-tokens.css';
import './styles/app.css';
import { App } from './App.tsx';
import { catalog } from './cards/load.ts';
import { AppDataProvider } from './data/AppData.tsx';
import { createScheduler } from './scheduler/fsrs.ts';

const scheduler = await createScheduler();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppDataProvider catalog={catalog} scheduler={scheduler}>
      <App />
    </AppDataProvider>
  </StrictMode>,
);
