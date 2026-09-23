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
  `px-3 py-2 rounded-full text-sm font-medium transition-all ${
    isActive
      ? 'bg-primary text-primary-foreground shadow-sm'
      : 'text-muted-foreground hover:bg-primary/8 hover:text-primary'
  }`;

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
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
    <div className="min-h-screen bg-background flex flex-col danone-app-shell">
      <header className="sticky top-0 z-40 border-b border-primary/10 bg-background/95 px-4 md:px-6 py-3 flex items-center gap-5 shadow-[0_1px_12px_rgba(0,55,130,0.06)] backdrop-blur">
        <Link to="/welcome" className="flex items-center gap-3 shrink-0" aria-label="Danone Shelf Optimizer home">
          <img src="/danone-logo.svg" alt="Danone" className="h-9 w-auto max-w-[116px] object-contain" />
          <span className="hidden sm:block h-7 w-px bg-border" aria-hidden="true" />
          <span className="hidden sm:block text-sm font-semibold leading-tight text-primary">
            Shelf
            <br />
            Optimizer
          </span>
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
                <SheetTitle className="flex items-center gap-3">
                  <img src="/danone-logo.svg" alt="Danone" className="h-9 w-auto max-w-[116px] object-contain" />
                  <span className="text-primary">Shelf Optimizer</span>
                </SheetTitle>
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
