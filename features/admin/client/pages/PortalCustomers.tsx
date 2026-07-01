import { Card, CardContent } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Skeleton } from '@shared/ui/skeleton';
import { trpc } from '@shared/lib/trpc';
import { Mail, Search, Users } from "lucide-react";
import { useState } from "react";

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PortalCustomers() {
  const [search, setSearch] = useState("");

  // customers.list returns users[] — only fields on the users table are available
  const customersQuery = trpc.portal.customers.list.useInfiniteQuery(
    { search: search || undefined, limit: 25 },
    { getNextPageParam: (lastPage) => lastPage.nextCursor }
  );

  const customers = customersQuery.data?.pages.flatMap(p => p.items) ?? [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Customers
          </h1>
          <p className="text-sm text-muted-foreground">All registered users — wedding clients, corporate contacts, and members</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Member Since</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last Sign-In</th>
                </tr>
              </thead>
              <tbody>
                {customersQuery.isLoading ? (
                  [1,2,3,4,5].map(i => (
                    <tr key={i} className="border-b border-border">
                      <td colSpan={5} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>
                    </tr>
                  ))
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No customers found</td>
                  </tr>
                ) : customers.map(c => (
                  <tr key={c.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{c.email ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                          <Mail className="w-3 h-3" />
                          <a href={`mailto:${c.email}`} className="hover:text-foreground">{c.email}</a>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground capitalize">
                        {c.role?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(c.lastLoginAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      {customersQuery.hasNextPage && (
        <button onClick={() => customersQuery.fetchNextPage()} disabled={customersQuery.isFetchingNextPage}
          className="mt-6 w-full py-2.5 border border-border text-[10px] tracking-[0.14em] uppercase font-sans text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40">
          {customersQuery.isFetchingNextPage ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
