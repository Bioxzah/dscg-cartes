import { useEffect } from 'react';
import { createHashRouter, RouterProvider, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout.tsx';
import { CardScreen } from './screens/CardScreen.tsx';
import { DashboardScreen } from './screens/DashboardScreen.tsx';
import { DecksScreen } from './screens/DecksScreen.tsx';
import { NotFound } from './screens/NotFound.tsx';
import { SettingsScreen } from './screens/SettingsScreen.tsx';
import { ThemeScreen } from './screens/ThemeScreen.tsx';
import { TodayScreen } from './screens/TodayScreen.tsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

function Root() {
  return (
    <>
      <ScrollToTop />
      <Layout />
    </>
  );
}

const router = createHashRouter([
  {
    element: <Root />,
    children: [
      { path: '/', element: <TodayScreen /> },
      { path: '/paquets', element: <DecksScreen /> },
      { path: '/paquets/:deckId/:themeId', element: <ThemeScreen /> },
      { path: '/carte/:cardId', element: <CardScreen /> },
      { path: '/tableau', element: <DashboardScreen /> },
      { path: '/reglages', element: <SettingsScreen /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
