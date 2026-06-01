import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "../../features/public-pages/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "../../features/_shared/components/ErrorBoundary";
import { ThemeProvider } from "../../features/_core/client/contexts/ThemeContext";
// Public pages
import Home from "../../features/public-pages/pages/Home";
import WeddingsLanding from "../../features/public-pages/pages/WeddingsLanding";
import MembershipLanding from "../../features/public-pages/pages/MembershipLanding";
import Weddings from "../../features/public-pages/pages/Weddings";
import Venues from "../../features/public-pages/pages/Venues";
import Lodging from "../../features/public-pages/pages/Lodging";
import Corporate from "../../features/public-pages/pages/Corporate";
import Estate from "../../features/public-pages/pages/Estate";
import Gallery from "../../features/public-pages/pages/Gallery";
import Contact from "../../features/public-pages/pages/Contact";
import Hunt from "../../features/public-pages/pages/Hunt";
import Fish from "../../features/public-pages/pages/Fish";
import Privacy from "../../features/public-pages/pages/Privacy";
// Inquiries
import InquiryConfirmed from "../../features/inquiries/client/pages/InquiryConfirmed";
// Membership
import Membership from "../../features/membership/client/pages/Membership";
// Waivers
import SignWaiver from "../../features/waivers/client/pages/SignWaiver";
import PortalWaivers from "../../features/waivers/client/pages/PortalWaivers";
// Gated pages
import MemberPortal from "../../features/member-portal/client/pages/MemberPortal";
import MyBookings from "../../features/member-portal/client/pages/MyBookings";
import PropertyBrowser from "../../features/member-portal/client/pages/PropertyBrowser";
import PropertyDetail from "../../features/member-portal/client/pages/PropertyDetail";
import PortalAvailability from "../../features/member-portal/client/pages/PortalAvailability";
// Admin portal
import AdminDashboard from "../../features/admin-portal/client/pages/AdminDashboard";
import PortalLayout from "../../features/admin-portal/client/components/PortalLayout";
import PortalDashboard from "../../features/admin-portal/client/pages/PortalDashboard";
import PortalCalendar from "../../features/admin-portal/client/pages/PortalCalendar";
import PortalWeddings from "../../features/admin-portal/client/pages/PortalWeddings";
import PortalCorporate from "../../features/admin-portal/client/pages/PortalCorporate";
import PortalHuntFish from "../../features/admin-portal/client/pages/PortalHuntFish";
import PortalMemberBookings from "../../features/admin-portal/client/pages/PortalMemberBookings";
import PortalCustomers from "../../features/admin-portal/client/pages/PortalCustomers";
import PortalEmployees from "../../features/admin-portal/client/pages/PortalEmployees";
import PortalMembership from "../../features/admin-portal/client/pages/PortalMembership";
import PortalReports from "../../features/admin-portal/client/pages/PortalReports";
import PortalBookings from "../../features/admin-portal/client/pages/PortalBookings";
import PortalLeads from "../../features/admin-portal/client/pages/PortalLeads";
import PortalNotifications from "../../features/admin-portal/client/pages/PortalNotifications";
import PortalTestimonials from "../../features/admin-portal/client/pages/PortalTestimonials";
import PortalProperties from "../../features/admin-portal/client/pages/PortalProperties";
// Reports
import PortalFieldReports from "../../features/reports/client/pages/PortalFieldReports";
import PortalNewsletter from "../../features/reports/client/pages/PortalNewsletter";

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
