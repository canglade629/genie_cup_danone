import { createBrowserRouter, RouterProvider, NavLink, Outlet, Link, Navigate } from 'react-router';
import { useState } from 'react';
import { Button, Sheet, SheetContent, SheetHeader, SheetTitle } from '@databricks/appkit-ui/react';
import { Menu } from 'lucide-react';
import { ParisMapPage } from './pages/ParisMapPage';
import { StoreDetailPage } from './pages/StoreDetailPage';
import { SignalsPage } from './pages/SignalsPage';
import { FirstConnectionPage, LandingPage } from './pages/LandingPage';
import { RevenuePage } from './pages/RevenuePage';
import { ActionsPage } from './pages/ActionsPage';
import { GeniePage } from './pages/GeniePage';
import { GenieLauncher } from './GenieLauncher';
import { GuidedTour } from './GuidedTour';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`;

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`;

type NavLinkClassFn = (props: { isActive: boolean }) => string;

function NavLinks({
  className,
  linkClass,
  onClick,
}: {
  className?: string;
  linkClass: NavLinkClassFn;
  onClick?: () => void;
}) {
  return (
    <nav className={className}>
      <NavLink to="/map" className={linkClass} onClick={onClick}>
        Paris map
      </NavLink>
      <NavLink to="/signals" className={linkClass} onClick={onClick}>
        Market signals
      </NavLink>
      <NavLink to="/revenue" className={linkClass} onClick={onClick}>
        Revenue impact
      </NavLink>
      <NavLink to="/actions" className={linkClass} onClick={onClick}>
        Accepted actions
      </NavLink>
    </nav>
  );
}

function Layout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b px-4 md:px-6 py-3 flex items-center gap-4">
        <Link to="/welcome" className="text-lg font-semibold text-foreground">
          Shelf Optimizer
        </Link>
        <NavLinks className="hidden md:flex gap-1" linkClass={navLinkClass} />
        <div className="ml-auto md:hidden">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(true)}>
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open navigation</span>
            </Button>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <NavLinks
                className="flex flex-col gap-1"
                linkClass={mobileNavLinkClass}
                onClick={() => setMobileNavOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6">
        <Outlet />
      </main>
      <GuidedTour />
      <GenieLauncher />
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <FirstConnectionPage /> },
      { path: '/welcome', element: <LandingPage /> },
      { path: '/map', element: <ParisMapPage /> },
      { path: '/demo', element: <Navigate to="/map?tour=1" replace /> },
      { path: '/stores/:storeId', element: <StoreDetailPage /> },
      { path: '/signals', element: <SignalsPage /> },
      { path: '/revenue', element: <RevenuePage /> },
      { path: '/actions', element: <ActionsPage /> },
      { path: '/ask', element: <GeniePage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
