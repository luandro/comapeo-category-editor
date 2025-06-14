import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useConfigStore } from '@/lib/store';
import EditorPage from '@/pages/editor';
import ImportPage from '@/pages/import';
import NotFound from '@/pages/not-found';
import { useEffect } from 'react';
import { Route, Switch, useLocation } from 'wouter';

function Router() {
  const [location, setLocation] = useLocation();
  const { loadConfigFromHash } = useConfigStore();

  useEffect(() => {
    // Check for a hashId in the URL
    if (location.startsWith('/#/config/')) {
      const hashId = location.replace('/#/config/', '');
      if (hashId) {
        loadConfigFromHash(hashId);
        // Redirect to editor page
        setLocation('/editor');
      }
    }
  }, [location, loadConfigFromHash, setLocation]);

  return (
    <Switch>
      <Route path="/" component={ImportPage} />
      <Route path="/editor" component={EditorPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <Toaster />
      <Router />
    </TooltipProvider>
  );
}

export default App;
