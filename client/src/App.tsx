import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
// Public pages
import Home from "./pages/Home";
import WeddingsLanding from "./pages/WeddingsLanding";
import MembershipLanding from "./pages/MembershipLanding";
import Weddings from "./pages/Weddings";
import Venues from "./pages/Venues";
import Lodging from "./pages/Lodging";
import Corporate from "./pages/Corporate";
import Estate from "./pages/Estate";
import Gallery from "./pages/Gallery";
import Contact from "./pages/Contact";
import Membership from "./pages/Membership";
import Hunt from "./pages/Hunt";
import Fish from "./pages/Fish";
// Gated pages
import MemberPortal from "./pages/MemberPortal";
import AdminDashboard from "../../features/admin-portal/client/pages/AdminDashboard";
// Operations Portal
import PortalLayout from "../../features/admin-portal/client/components/PortalLayout";
import PortalDashboard from "../../features/admin-portal/client/pages/PortalDashboard";
import PortalCalendar from "../../features/admin-portal/client/pages/PortalCalendar";
import PortalWeddings from "../../features/admin-portal/client/pages/PortalWeddings";
import PortalCorporate from "../../features/admin-portal/client/pages/PortalCorporate";
import PortalHuntFish from "../../features/admin-portal/client/pages/PortalHuntFish";
import PortalMemberBookings from "../../features/admin-portal/client/pages/PortalMemberBookings";
import PortalWaivers from "../../features/waivers/client/pages/PortalWaivers";
import PortalCustomers from "../../features/admin-portal/client/pages/PortalCustomers";
import PortalEmployees from "../../features/admin-portal/client/pages/PortalEmployees";
import PortalMembership from "../../features/admin-portal/client/pages/PortalMembership";
import PortalReports from "../../features/admin-portal/client/pages/PortalReports";
import PortalFieldReports from "../../features/reports/client/pages/PortalFieldReports";
import PortalNewsletter from "../../features/reports/client/pages/PortalNewsletter";
import PortalBookings from "../../features/admin-portal/client/pages/PortalBookings";
import PortalLeads from "../../features/admin-portal/client/pages/PortalLeads";
import PortalAvailability from "./pages/portal/PortalAvailability";
import PortalNotifications from "../../features/admin-portal/client/pages/PortalNotifications";
import PortalTestimonials from "../../features/admin-portal/client/pages/PortalTestimonials";
import PortalProperties from "../../features/admin-portal/client/pages/PortalProperties";
import PropertyBrowser from "./pages/portal/PropertyBrowser";
import PropertyDetail from "./pages/portal/PropertyDetail";
import MyBookings from "./pages/portal/MyBookings";
import SignWaiver from "./pages/SignWaiver";
import Privacy from "@/pages/Privacy";
import InquiryConfirmed from "@/pages/InquiryConfirmed";

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Home} />
      <Route path="/events" component={WeddingsLanding} />
      <Route path="/outdoors" component={MembershipLanding} />
      <Route path="/weddings" component={Weddings} />
      <Route path="/venues" component={Venues} />
      <Route path="/lodging" component={Lodging} />
      <Route path="/corporate" component={Corporate} />
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
      {/* Fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
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
