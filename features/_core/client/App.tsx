import { Toaster } from '@shared/ui/sonner';
import { TooltipProvider } from '@shared/ui/tooltip';
import NotFound from "../../public-pages/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "../../_shared/components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
// Public pages
import Home from "../../public-pages/pages/Home";
import WeddingsLanding from "../../public-pages/pages/WeddingsLanding";
import MembershipLanding from "../../public-pages/pages/MembershipLanding";
import Weddings from "../../public-pages/pages/Weddings";
import Venues from "../../public-pages/pages/Venues";
import Lodging from "../../public-pages/pages/Lodging";
import Corporate from "../../public-pages/pages/Corporate";
import Estate from "../../public-pages/pages/Estate";
import Gallery from "../../public-pages/pages/Gallery";
import Contact from "../../public-pages/pages/Contact";
import Hunt from "../../public-pages/pages/Hunt";
import Fish from "../../public-pages/pages/Fish";
import Privacy from "../../public-pages/pages/Privacy";
// Inquiries
import InquiryConfirmed from "../../inquiries/client/pages/InquiryConfirmed";
// Membership
import Membership from "../../membership/client/pages/Membership";
// Waivers
import SignWaiver from "../../waivers/client/pages/SignWaiver";
import PortalWaivers from "../../waivers/client/pages/PortalWaivers";
// Gated pages
import MemberPortal from "../../portal/client/pages/MemberPortal";
import MyBookings from "../../portal/client/pages/MyBookings";
import PropertyBrowser from "../../portal/client/pages/PropertyBrowser";
import PropertyDetail from "../../portal/client/pages/PropertyDetail";
import PortalAvailability from "../../portal/client/pages/PortalAvailability";
// Admin portal
import AdminDashboard from "../../admin/client/pages/AdminDashboard";
import PortalLayout from "../../admin/client/components/PortalLayout";
import PortalDashboard from "../../admin/client/pages/PortalDashboard";
import PortalCalendar from "../../admin/client/pages/PortalCalendar";
import PortalWeddings from "../../admin/client/pages/PortalWeddings";
import PortalCorporate from "../../admin/client/pages/PortalCorporate";
import PortalHuntFish from "../../admin/client/pages/PortalHuntFish";
import PortalMemberBookings from "../../admin/client/pages/PortalMemberBookings";
import PortalCustomers from "../../admin/client/pages/PortalCustomers";
import PortalEmployees from "../../admin/client/pages/PortalEmployees";
import PortalMembership from "../../admin/client/pages/PortalMembership";
import PortalReports from "../../admin/client/pages/PortalReports";
import PortalBookings from "../../admin/client/pages/PortalBookings";
import PortalLeads from "../../admin/client/pages/PortalLeads";
import PortalNotifications from "../../admin/client/pages/PortalNotifications";
import PortalTestimonials from "../../admin/client/pages/PortalTestimonials";
import PortalProperties from "../../admin/client/pages/PortalProperties";
// Reports
import PortalFieldReports from "../../reports/client/pages/PortalFieldReports";
import PortalNewsletter from "../../reports/client/pages/PortalNewsletter";

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
