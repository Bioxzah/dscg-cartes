import { Outlet } from 'react-router-dom';
import { TabBar } from './TabBar.tsx';

export function Layout() {
  return (
    <div className="app">
      <Outlet />
      <TabBar />
    </div>
  );
}
