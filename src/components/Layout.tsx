import { Outlet } from 'react-router-dom';
import { TabBar } from './TabBar.tsx';
import { UpdateBanner } from './UpdateBanner.tsx';

export function Layout() {
  return (
    <div className="app">
      <UpdateBanner />
      <Outlet />
      <TabBar />
    </div>
  );
}
