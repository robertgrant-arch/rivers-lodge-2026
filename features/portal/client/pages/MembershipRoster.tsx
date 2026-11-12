/**
 * /portal/roster — Membership Roster.
 *
 * Names, phone numbers and emails of active members, from the Member File and
 * each member's login. Access is enforced by memberPortal.roster on the
 * server (admins + active members only); this page just shows what the API
 * returns, or a "members only" message when it refuses.
 */
import { useMemo, useState } from "react";
import { Mail, Phone, Search } from "lucide-react";
import { useAuth } from "@features/auth/public";
import { trpc } from "@shared/lib/trpc";
import MemberPortalLayout from "@features/portal/client/components/MemberPortalLayout";
import { usePortalLink } from "@features/portal/client/portalNav";

function Missing({ children }: { children: React.ReactNode }) {
  return <span className="text-white/30 italic">{children}</span>;
}

/** Digits (and a leading +) for a tel: link; null if nothing dialable. */
function telHref(phone: string): string | null {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits.replace(/\D/g, "").length >= 7 ? `tel:${digits}` : null;
}

export default function MembershipRoster() {
  const { isAuthenticated, loading } = useAuth({ redirectOnUnauthenticated: true });
  const portalLink = usePortalLink();
  const [query, setQuery] = useState("");
  const roster = trpc.memberPortal.roster.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  const filtered = useMemo(() => {
    const rows = roster.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name, r.email, r.phone].some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [roster.data, query]);

  const forbidden = roster.error?.data?.code === "FORBIDDEN";

  return (
    <MemberPortalLayout>
      <div className="min-h-screen bg-background">
        <div className="bg-[#2B2823] border-b border-white/8 pt-10 pb-8">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-16">
            <p className="eyebrow text-white/40 mb-2">Member Portal</p>
            <h1 className="font-serif text-3xl md:text-4xl text-white mb-3">Membership Roster</h1>
            <p className="text-sm font-sans text-white/40">Contact details for fellow members. For members' use only — please don't share.</p>
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-16 py-8">
          {loading || (isAuthenticated && roster.isLoading) ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border border-white/20 border-t-white/60 rounded-full animate-spin" />
            </div>
          ) : !isAuthenticated ? null : forbidden ? (
            <div className="max-w-md mx-auto text-center py-16 border border-white/8 bg-[#2B2823] px-6">
              <p className="font-serif text-2xl text-white mb-3">Members only.</p>
              <p className="text-sm font-sans text-white/50 mb-6">The Membership Roster is available to active members.</p>
              <a href={portalLink("/portal")} className="btn-primary inline-flex items-center justify-center px-6 py-3">Back to Portal</a>
            </div>
          ) : roster.error ? (
            <div className="text-center py-16 border border-white/8 bg-[#2B2823]">
              <p className="font-serif text-xl text-white mb-2">The roster couldn't be loaded.</p>
              <p className="text-sm font-sans text-white/40">Please try again in a moment.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <label className="relative w-full sm:max-w-sm">
                  <span className="sr-only">Search the roster</span>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" aria-hidden="true" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name, phone or email"
                    className="w-full bg-[#2B2823] border border-white/10 focus:border-[var(--gold)] outline-none pl-9 pr-3 py-2.5 text-sm font-sans text-white placeholder:text-white/30"
                  />
                </label>
                <p className="text-xs font-sans text-white/40 tracking-[0.08em]">
                  {filtered.length} of {roster.data?.length ?? 0} members
                </p>
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-16 border border-white/8 bg-[#2B2823]">
                  <p className="font-serif text-xl text-white mb-2">
                    {(roster.data?.length ?? 0) === 0 ? "No members to show yet." : "No members match your search."}
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block border border-white/8 bg-[#2B2823]" data-testid="roster-table">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th scope="col" className="px-5 py-3 text-[10px] tracking-[0.16em] uppercase font-sans font-medium text-white/40">Name</th>
                          <th scope="col" className="px-5 py-3 text-[10px] tracking-[0.16em] uppercase font-sans font-medium text-white/40">Phone</th>
                          <th scope="col" className="px-5 py-3 text-[10px] tracking-[0.16em] uppercase font-sans font-medium text-white/40">Email</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filtered.map((m) => {
                          const tel = m.phone ? telHref(m.phone) : null;
                          return (
                            <tr key={m.memberId}>
                              <td className="px-5 py-3.5 text-sm font-sans text-white">{m.name ?? <Missing>Name not on file</Missing>}</td>
                              <td className="px-5 py-3.5 text-sm font-sans text-white/80 whitespace-nowrap">
                                {m.phone ? (tel ? <a href={tel} className="hover:text-[var(--gold)]">{m.phone}</a> : m.phone) : <Missing>Not provided</Missing>}
                              </td>
                              <td className="px-5 py-3.5 text-sm font-sans text-white/80 break-all">
                                {m.email ? <a href={`mailto:${m.email}`} className="hover:text-[var(--gold)]">{m.email}</a> : <Missing>Not provided</Missing>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <ul className="md:hidden flex flex-col gap-3" data-testid="roster-cards">
                    {filtered.map((m) => {
                      const tel = m.phone ? telHref(m.phone) : null;
                      return (
                        <li key={m.memberId} className="border border-white/8 bg-[#2B2823] p-4">
                          <p className="text-base font-sans font-medium text-white mb-2">{m.name ?? <Missing>Name not on file</Missing>}</p>
                          <p className="flex items-center gap-2 text-sm font-sans text-white/80 mb-1.5">
                            <Phone className="w-3.5 h-3.5 text-white/40 shrink-0" aria-hidden="true" />
                            <span className="sr-only">Phone:</span>
                            {m.phone ? (tel ? <a href={tel} className="hover:text-[var(--gold)]">{m.phone}</a> : m.phone) : <Missing>Not provided</Missing>}
                          </p>
                          <p className="flex items-center gap-2 text-sm font-sans text-white/80 min-w-0">
                            <Mail className="w-3.5 h-3.5 text-white/40 shrink-0" aria-hidden="true" />
                            <span className="sr-only">Email:</span>
                            {m.email ? <a href={`mailto:${m.email}`} className="hover:text-[var(--gold)] break-all">{m.email}</a> : <Missing>Not provided</Missing>}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </MemberPortalLayout>
  );
}
