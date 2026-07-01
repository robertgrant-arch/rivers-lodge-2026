import { Skeleton } from '@shared/ui/skeleton';
import { Separator } from '@shared/ui/separator';
import { trpc } from '@shared/lib/trpc';
import { Link } from 'wouter';

// ─── helpers ────────────────────────────────────────────────────────────────

function todayLabel() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatEventDate(d: string | Date | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function eventTypeLabel(type: string | undefined) {
  if (!type) return 'Event';
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── sub-components ─────────────────────────────────────────────────────────

function GoldRule() {
  return <div className="h-px bg-[#9B4D19]/40 mt-1 mb-4" />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-sans tracking-[0.12em] uppercase text-xs text-[#BABAAE]">
      {children}
    </p>
  );
}

interface StatCardProps {
  label: string;
  value: number | string | undefined;
  context?: string;
  loading?: boolean;
}

function StatCard({ label, value, context, loading }: StatCardProps) {
  return (
    <div className="bg-[#363330] border border-[#57544E] p-5 flex flex-col gap-2">
      <p className="font-sans tracking-[0.12em] uppercase text-xs text-[#BABAAE]">
        {label}
      </p>
      {loading ? (
        <Skeleton className="h-9 w-20 bg-[#423F3B]" />
      ) : (
        <p className="font-sans text-3xl font-semibold text-[#E0D3BD] leading-none">
          {value ?? '—'}
        </p>
      )}
      {context && (
        <p className="font-sans text-xs text-[#BABAAE]">{context}</p>
      )}
    </div>
  );
}

function ArrowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1.5 font-sans text-xs tracking-[0.08em] uppercase text-[#BABAAE] hover:text-[#E0D3BD] transition-colors"
    >
      {children}
      <span className="transition-transform group-hover:translate-x-0.5">→</span>
    </Link>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function PortalDashboard() {
  const kpisQuery = trpc.portal.dashboard.kpis.useQuery();
  const memberStatsQuery = trpc.portal.membership.stats.useQuery();
  const usersQuery = trpc.portal.users.list.useQuery({ search: '' });
  const upcomingQuery = trpc.portal.dashboard.upcomingEvents.useQuery();

  const kpis = kpisQuery.data;
  const memberStats = memberStatsQuery.data;
  const users = usersQuery.data ?? [];
  const upcomingData = upcomingQuery.data;
  const upcomingEvents = upcomingData
    ? [
        ...(upcomingData.weddings ?? []).map((e: any) => ({ id: e.id, date: e.weddingDate, type: 'wedding', name: e.coupleName ?? e.title })),
        ...(upcomingData.corporate ?? []).map((e: any) => ({ id: e.id, date: e.arrivalDate, type: 'corporate', name: e.title ?? e.groupName })),
      ].sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')))
    : [];

  const pendingInvites = Array.isArray(users)
    ? users.filter((u: { status?: string }) => u.status === 'invited').length
    : 0;

  const statsLoading =
    kpisQuery.isLoading || memberStatsQuery.isLoading || usersQuery.isLoading;
  const upcomingLoading = upcomingQuery.isLoading;

  const anyError =
    kpisQuery.isError || memberStatsQuery.isError || usersQuery.isError || upcomingQuery.isError;

  return (
    <div className="min-h-screen bg-background px-6 py-10 max-w-5xl mx-auto">
      {/* ── Page header ── */}
      <div className="mb-8">
        <p className="font-sans tracking-[0.12em] uppercase text-xs text-[#BABAAE] mb-1">
          Operations
        </p>
        <h1 className="font-sans text-2xl font-medium tracking-tight text-[#E0D3BD]">
          Dashboard
        </h1>
        <p className="font-sans text-sm text-[#BABAAE] mt-1">{todayLabel()}</p>
      </div>

      {/* ── Error banner ── */}
      {anyError && (
        <div className="mb-6 bg-[#363330] border border-[#9B4D19]/50 px-4 py-3">
          <p className="font-sans text-xs text-[#BABAAE]">
            Some data could not be loaded. Please refresh or contact support if the issue persists.
          </p>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="mb-1">
        <SectionLabel>Overview</SectionLabel>
        <GoldRule />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <StatCard
          label="Total Members"
          value={memberStats?.total}
          context="All membership tiers"
          loading={statsLoading}
        />
        <StatCard
          label="Active Members"
          value={memberStats?.active ?? kpis?.activeMembers}
          context={
            memberStats?.pendingRenewal != null
              ? `${memberStats.pendingRenewal} pending renewal`
              : undefined
          }
          loading={statsLoading}
        />
        <StatCard
          label="Pending Invites"
          value={usersQuery.isLoading ? undefined : pendingInvites}
          context="Awaiting account setup"
          loading={usersQuery.isLoading}
        />
        <StatCard
          label="Upcoming Events"
          value={upcomingLoading ? undefined : upcomingEvents.length}
          context="Confirmed bookings"
          loading={upcomingLoading}
        />
      </div>

      {/* ── Upcoming events ── */}
      <div className="mb-1">
        <SectionLabel>Upcoming Events</SectionLabel>
        <GoldRule />
      </div>

      <div className="bg-[#363330] border border-[#57544E] mb-10">
        {upcomingLoading ? (
          <div className="divide-y divide-[#57544E]">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4">
                <Skeleton className="h-4 w-24 bg-[#423F3B]" />
                <Skeleton className="h-4 w-16 bg-[#423F3B]" />
                <Skeleton className="h-4 w-40 bg-[#423F3B]" />
              </div>
            ))}
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="font-sans text-sm text-[#BABAAE]">No upcoming events on the books.</p>
            <p className="font-sans text-xs text-[#BABAAE]/60 mt-1">
              Confirmed bookings will appear here.
            </p>
          </div>
        ) : (
          <div>
            {upcomingEvents.slice(0, 5).map(
              (
                event: {
                  id?: string | number;
                  date?: string | Date | null;
                  type?: string;
                  name?: string;
                  label?: string;
                },
                idx: number,
              ) => (
                <div key={event.id ?? idx}>
                  <div className="px-5 py-4 flex items-start gap-5 hover:bg-[#423F3B]/50 transition-colors">
                    {/* Date column */}
                    <div className="w-28 flex-shrink-0">
                      <p className="font-sans text-xs text-[#BABAAE]">
                        {formatEventDate(event.date)}
                      </p>
                    </div>

                    {/* Type column */}
                    <div className="w-32 flex-shrink-0">
                      <span className="font-sans text-xs tracking-[0.08em] uppercase text-[#BABAAE]">
                        {eventTypeLabel(event.type)}
                      </span>
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-sm text-[#E0D3BD] truncate">
                        {event.name ?? event.label ?? 'Unnamed Event'}
                      </p>
                    </div>
                  </div>
                  {idx < Math.min(upcomingEvents.length, 5) - 1 && (
                    <Separator className="bg-[#57544E]/50" />
                  )}
                </div>
              ),
            )}
          </div>
        )}
      </div>

      {/* ── Quick navigation ── */}
      <div className="mb-1">
        <SectionLabel>Quick Access</SectionLabel>
        <GoldRule />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
        <ArrowLink href="/ops/calendar">Calendar</ArrowLink>
        <ArrowLink href="/ops/membership">Members</ArrowLink>
        <ArrowLink href="/ops/users">Invitations</ArrowLink>
        <ArrowLink href="/ops/weddings">Weddings</ArrowLink>
        <ArrowLink href="/ops/field-reports">Field Reports</ArrowLink>
      </div>
    </div>
  );
}
