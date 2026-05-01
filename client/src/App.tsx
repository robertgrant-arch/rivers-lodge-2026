import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Public pages
import Home from "./pages/Home";
import Weddings from "./pages/Weddings";
import Venues from "./pages/Venues";
import Lodging from "./pages/Lodging";
import Corporate from "./pages/Corporate";
import Estate from "./pages/Estate";
import Gallery from "./pages/Gallery";
import Contact from "./pages/Contact";
import Membership from "./pages/Membership";
import Hunt from "./pages/Hunt";

// Gated pages
import MemberPortal from "./pages/MemberPortal";
import AdminDashboard from "./pages/AdminDashboard";

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Home} />
      <Route path="/weddings" component={Weddings} />
      <Route path="/venues" component={Venues} />
      <Route path="/lodging" component={Lodging} />
      <Route path="/corporate" component={Corporate} />
      <Route path="/estate" component={Estate} />
      <Route path="/gallery" component={Gallery} />
      <Route path="/contact" component={Contact} />
      <Route path="/membership" component={Membership} />
      <Route path="/hunt" component={Hunt} />

      {/* Gated */}
      <Route path="/portal" component={MemberPortal} />
      <Route path="/admin" component={AdminDashboard} />

      {/* Fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
