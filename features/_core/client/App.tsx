import { Suspense, lazy } from "react";
import { SignIn } from "@clerk/clerk-react";
import { Toaster } from '@shared/ui/sonner';
import { TooltipProvider } from '@shared/ui/tooltip';
import { Route, Switch } from "wouter";
import ErrorBoundary from "../../_shared/components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useScrollToTop } from '@shared/hooks/useScrollToTop';
// Layout components — must be sync (used by every /ops page simultaneously)
import PortalLayout from "../../admin/client/components/PortalLayout";

// ComponentShowcase is dev-only.  import.meta.env.DEV is a compile-time
// constant that Vite replaces with `false` in production builds, so the
// dynamic import() call is never evaluated and the chunk is never emitted.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ComponentShowcase: React.LazyExoticComponent<any> | null = import.meta.env.DEV
  ? lazy(() => import("@features/_shared/pages/ComponentShowcase"))
  : null;

// Public / marketing pages
const Home = lazy(() => import("@features/marketing/client/pages/Home"));
const MembershipLanding = lazy(() => import("@features/marketing/client/pages/MembershipLanding"));
const Gallery = lazy(() => import("@features/marketing/client/pages/Gallery"));
const Contact = lazy(() => import("@features/marketing/client/pages/Contact"));
const Privacy = lazy(() => import("@features/marketing/client/pages/Privacy"));
const NotFound = lazy(() => import("@features/marketing/client/pages/NotFound"));

// Weddings pages
const WeddingsLanding = lazy(() => import("@features/weddings/client/pages/WeddingsLanding"));
const Weddings = lazy(() => import("@features/weddings/client/pages/Weddings"));
const Venues = lazy(() => import("@features/weddings/client/pages/Venues"));

// Hunt & Fish pages
const Hunt = lazy(() => import("@features/hunt-fish/client/pages/Hunt"));
const Fish = lazy(() => import("@features/hunt-fish/client/pages/Fish"));

// Lodging pages
const Lodging = lazy(() => import("@features/lodging/client/pages/Lodging"));
const Estate = lazy(() => import("@features/lodging/client/pages/Estate"));

// Corporate pages
const Corporate = lazy(() => import("@features/corporate/client/pages/Corporate"));

// Food & Wine page
const FoodAndWine = lazy(() => import("@features/food-and-wine/client/pages/FoodAndWine"));

// Membership pages
const Membership = lazy(() => import("@features/membership/client/pages/Membership"));

// Inquiries
const InquiryConfirmed = lazy(() => import("@features/inquiries/client/pages/InquiryConfirmed"));

// Waivers
const SignWaiver = lazy(() => import("@features/waivers/client/pages/SignWaiver"));
const PortalWaivers = lazy(() => import("@features/waivers/client/pages/PortalWaivers"));

// Gated portal pages
const MemberPortal = lazy(() => import("@features/portal/client/pages/MemberPortal"));
const MyBookings = lazy(() => import("@features/portal/client/pages/MyBookings"));
const PropertyBrowser = lazy(() => import("@features/portal/client/pages/PropertyBrowser"));
const PropertyDetail = lazy(() => import("@features/portal/client/pages/PropertyDetail"));
const PortalAvailability = lazy(() => import("@features/portal/client/pages/PortalAvailability"));

// Admin portal pages
const AdminDashboard = lazy(() => import("@features/admin/client/pages/AdminDashboard"));
const PortalDashboard = lazy(() => import("@features/admin/client/pages/PortalDashboard"));
const PortalCalendar = lazy(() => import("@features/admin/client/pages/PortalCalendar"));
const PortalWeddings = lazy(() => import("@features/admin/client/pages/PortalWeddings"));
const PortalCorporate = lazy(() => import("@features/admin/client/pages/PortalCorporate"));
const PortalHuntFish = lazy(() => import("@features/admin/client/pages/PortalHuntFish"));
const PortalMemberBookings = lazy(() => import("@features/admin/client/pages/PortalMemberBookings"));
const PortalCustomers = lazy(() => import("@features/admin/client/pages/PortalCustomers"));
const PortalEmployees = lazy(() => import("@features/admin/client/pages/PortalEmployees"));
const PortalMembership = lazy(() => import("@features/admin/client/pages/PortalMembership"));
const PortalReports = lazy(() => import("@features/admin/client/pages/PortalReports"));
const PortalBookings = lazy(() => import("@features/admin/client/pages/PortalBookings"));
const PortalLeads = lazy(() => import("@features/admin/client/pages/PortalLeads"));
const PortalNotifications = lazy(() => import("@features/admin/client/pages/PortalNotifications"));
const PortalTestimonials = lazy(() => import("@features/admin/client/pages/PortalTestimonials"));
const PortalProperties = lazy(() => import("@features/admin/client/pages/PortalProperties"));

// Reports pages
const PortalFieldReports = lazy(() => import("@features/reports/client/pages/PortalFieldReports"));
const PortalNewsletter = lazy(() => import("@features/reports/client/pages/PortalNewsletter"));

/**
 * RouteLoader — shown by <Suspense> while a lazy page chunk is loading.
 *
 * Intentionally minimal to avoid layout shift: full-viewport dark background
 * matching the site theme + a single gold spinner.  No text — avoids the
 * "Loading…" flash for fast connections where the chunk arrives in < 100 ms.
 */
function RouteLoader() {
  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center"
      role="status"
      aria-label="Loading page"
    >
      <div className="w-8 h-8 border-2 border-[oklch(0.72_0.095_78)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Router() {
  useScrollToTop();
  return (
    <Suspense fallback={<RouteLoader />}>
      <Switch>
        {/* Auth pages — rendered by Clerk */}
        <Route path="/sign-in">{() => <div className="min-h-screen flex items-center justify-center bg-background"><SignIn routing="path" path="/sign-in" afterSignInUrl="/portal" signUpUrl="" appearance={{ elements: { footer: "hidden", footerAction: "hidden", footerActionLink: "hidden" } }} /></div>}</Route>
        <Route path="/sign-up">{() => { window.location.replace("/sign-in"); return null; }}</Route>

        {/* Public */}
        <Route path="/" component={Home} />
        <Route path="/events" component={WeddingsLanding} />
        <Route path="/outdoors" component={MembershipLanding} />
        <Route path="/weddings" component={Weddings} />
        <Route path="/venues" component={Venues} />
        <Route path="/lodging" component={Lodging} />
        <Route path="/corporate" component={Corporate} />
        <Route path="/food-and-wine" component={FoodAndWine} />
        <Route path="/estate" component={Estate} />
        <Route path="/gallery" component={Gallery} />
        <Route path="/contact" component={Contact} />
        <Route path="/membership" component={Membership} />
        <Route path="/hunt" component={Hunt} />
        <Route path="/fish" component={Fish} />

        {/* Gated */}
        <Route path="/portal" component={MemberPortal} />
        <Route path="/portal/properties" component={PropertyBrowser} />
        <Route path="/portal/properties/:id" component={PropertyDetail} />
        <Route path="/portal/my-bookings" component={MyBookings} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/inquiry-confirmed" component={InquiryConfirmed} />
        <Route path="/admin" component={AdminDashboard} />
        {/* Operations Portal */}
        <Route path="/ops">{() => <PortalLayout><PortalDashboard /></PortalLayout>}</Route>
        <Route path="/ops/calendar">{() => <PortalLayout><PortalCalendar /></PortalLayout>}</Route>
        <Route path="/ops/notifications">{() => <PortalLayout><PortalNotifications /></PortalLayout>}</Route>
        <Route path="/ops/weddings/:id">{(p) => <PortalLayout><PortalWeddings /></PortalLayout>}</Route>
        <Route path="/ops/weddings">{() => <PortalLayout><PortalWeddings /></PortalLayout>}</Route>
        <Route path="/ops/corporate/:id">{(p) => <PortalLayout><PortalCorporate /></PortalLayout>}</Route>
        <Route path="/ops/corporate">{() => <PortalLayout><PortalCorporate /></PortalLayout>}</Route>
        <Route path="/ops/hunt-fish/:id">{(p) => <PortalLayout><PortalHuntFish /></PortalLayout>}</Route>
        <Route path="/ops/hunt-fish">{() => <PortalLayout><PortalHuntFish /></PortalLayout>}</Route>
        <Route path="/ops/member-bookings">{() => <PortalLayout><PortalMemberBookings /></PortalLayout>}</Route>
        <Route path="/ops/waivers">{() => <PortalLayout><PortalWaivers /></PortalLayout>}</Route>
        <Route path="/ops/customers">{() => <PortalLayout><PortalCustomers /></PortalLayout>}</Route>
        <Route path="/ops/employees">{() => <PortalLayout><PortalEmployees /></PortalLayout>}</Route>
        <Route path="/ops/membership">{() => <PortalLayout><PortalMembership /></PortalLayout>}</Route>
        <Route path="/ops/reports">{() => <PortalLayout><PortalReports /></PortalLayout>}</Route>
        <Route path="/ops/bookings/:id">{() => <PortalLayout><PortalBookings /></PortalLayout>}</Route>
        <Route path="/ops/bookings">{() => <PortalLayout><PortalBookings /></PortalLayout>}</Route>
        <Route path="/ops/leads">{() => <PortalLayout><PortalLeads /></PortalLayout>}</Route>
        <Route path="/ops/availability">{() => <PortalLayout><PortalAvailability /></PortalLayout>}</Route>
        <Route path="/ops/testimonials">{() => <PortalLayout><PortalTestimonials /></PortalLayout>}</Route>
        <Route path="/ops/properties">{() => <PortalLayout><PortalProperties /></PortalLayout>}</Route>
        <Route path="/ops/field-reports">{() => <PortalLayout><PortalFieldReports /></PortalLayout>}</Route>
        <Route path="/ops/newsletter">{() => <PortalLayout><PortalNewsletter /></PortalLayout>}</Route>
        {/* Public waiver signing */}
        <Route path="/sign-waiver/:token">{(p) => <SignWaiver />}</Route>
        {/* Dev-only: component showcase — tree-shaken from production builds */}
        {import.meta.env.DEV && ComponentShowcase && (
          <Route path="/showcase" component={ComponentShowcase} />
        )}
        {/* Fallback */}
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
