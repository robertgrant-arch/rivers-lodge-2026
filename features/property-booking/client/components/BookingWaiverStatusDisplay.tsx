/**
 * Booking Waiver Status Display
 * ============================
 * Admin component showing per-adult waiver status for a booking.
 * Displays deadline, current status, and overdue flags.
 */

import { AlertCircle, CheckCircle2, Clock, FileText } from "lucide-react";
import { Badge } from "@shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";

interface PartyAdultStatus {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  isDesignatedMember: boolean;
  waiverStatus: string;
  minorCount: number;
  deadlineMs: number;
  isOverdue: boolean;
  hoursUntilDue: number;
}

interface BookingWaiverDisplayProps {
  bookingRef: string;
  startDate: string;
  adults: PartyAdultStatus[];
  allWaiversSigned: boolean;
  anyOverdue: boolean;
}

const WAIVER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-900/20 text-amber-300 border-amber-700",
  sent: "bg-blue-900/20 text-blue-300 border-blue-700",
  completed: "bg-emerald-900/20 text-emerald-300 border-emerald-700",
  overdue: "bg-red-900/20 text-red-300 border-red-700",
};

const WAIVER_STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-4 h-4" />,
  sent: <FileText className="w-4 h-4" />,
  completed: <CheckCircle2 className="w-4 h-4" />,
  overdue: <AlertCircle className="w-4 h-4" />,
};

function formatDeadline(deadlineMs: number): string {
  const d = new Date(deadlineMs);
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate();
  const time = d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${month} ${day} at ${time}`;
}

export function BookingWaiverStatusDisplay({
  bookingRef,
  startDate,
  adults,
  allWaiversSigned,
  anyOverdue,
}: BookingWaiverDisplayProps) {
  return (
    <Card className="bg-stone-900 border-stone-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-sm text-stone-100">Waiver Status — {bookingRef}</CardTitle>
            <p className="text-xs text-stone-400">Check-in: {startDate}</p>
          </div>
          <div className="flex gap-2">
            {allWaiversSigned && (
              <Badge variant="outline" className="border-emerald-700 bg-emerald-900/20 text-emerald-300">
                ✓ All Signed
              </Badge>
            )}
            {anyOverdue && (
              <Badge variant="outline" className="border-red-700 bg-red-900/20 text-red-300">
                ⚠ Overdue
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {adults.map((adult) => {
            const statusColor = WAIVER_STATUS_COLORS[adult.waiverStatus] || "bg-stone-800 text-stone-300 border-stone-700";
            const statusIcon = WAIVER_STATUS_ICONS[adult.waiverStatus];
            const deadline = formatDeadline(adult.deadlineMs);

            return (
              <div key={adult.id} className="border border-stone-700 rounded-lg p-3 space-y-2 bg-stone-800/50">
                {/* Adult header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-stone-100 truncate">{adult.fullName}</span>
                      {adult.isDesignatedMember && (
                        <span className="text-xs px-2 py-1 bg-amber-900/30 text-amber-300 rounded border border-amber-700/50">
                          Booker
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400">{adult.email}</p>
                  </div>
                  <div className={`flex items-center gap-1 px-2.5 py-1 rounded border ${statusColor}`}>
                    {statusIcon}
                    <span className="text-xs font-medium capitalize">{adult.waiverStatus}</span>
                  </div>
                </div>

                {/* Status details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-stone-400">Phone:</span>
                    <p className="text-stone-200">{adult.phone}</p>
                  </div>
                  <div>
                    <span className="text-stone-400">Minors:</span>
                    <p className="text-stone-200">{adult.minorCount} dependent{adult.minorCount !== 1 ? "s" : ""}</p>
                  </div>
                </div>

                {/* Deadline and overdue indicator */}
                <div className="pt-1 border-t border-stone-700">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-400">Deadline: {deadline}</span>
                    {adult.isOverdue ? (
                      <span className="text-red-300 font-medium">
                        ⚠ Overdue {Math.abs(Math.round(adult.hoursUntilDue))}h ago
                      </span>
                    ) : (
                      <span className="text-amber-300">
                        {adult.hoursUntilDue > 24
                          ? `${Math.round(adult.hoursUntilDue / 24)}d remaining`
                          : `${Math.round(adult.hoursUntilDue)}h remaining`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary footer */}
        {(anyOverdue || !allWaiversSigned) && (
          <div className="mt-3 p-2.5 bg-red-900/10 border border-red-800/30 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">
              {anyOverdue
                ? "One or more waivers are overdue. Contact members to complete signing."
                : "Some waivers are still pending. Send reminders if booking date is approaching."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
