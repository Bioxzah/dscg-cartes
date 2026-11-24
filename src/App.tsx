import { useEffect } from 'react';
import { createHashRouter, RouterProvider, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout.tsx';
import { CardScreen } from './screens/CardScreen.tsx';
import { DashboardScreen } from './screens/DashboardScreen.tsx';
import { DecksScreen } from './screens/DecksScreen.tsx';
import { FicheScreen } from './screens/FicheScreen.tsx';
import { FichesScreen } from './screens/FichesScreen.tsx';
import { NotFound } from './screens/NotFound.tsx';
import { QuizRoute } from './screens/QuizScreen.tsx';
import { DailySessionScreen, FreeSessionScreen } from './screens/SessionScreen.tsx';
import { SettingsScreen } from './screens/SettingsScreen.tsx';
import { ThemeScreen } from './screens/ThemeScreen.tsx';
import { TodayScreen } from './screens/TodayScreen.tsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
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
  // Sessions are full screen: no tab bar.
  { path: '/session', element: <DailySessionScreen /> },
  { path: '/session/libre/:deckId/:themeId', element: <FreeSessionScreen /> },
  // A fiche is read full screen too.
  { path: '/fiches/:deckId', element: <FicheScreen /> },
  { path: '/quiz/:deckId', element: <QuizRoute /> },
  {
    element: <Root />,
    children: [
      { path: '/', element: <TodayScreen /> },
      { path: '/paquets', element: <DecksScreen /> },
      { path: '/paquets/:deckId/:themeId', element: <ThemeScreen /> },
      { path: '/fiches', element: <FichesScreen /> },
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
