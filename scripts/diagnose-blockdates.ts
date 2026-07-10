#!/usr/bin/env node

/**
 * Diagnostic script: Direct API isolation test for blockDates mutation + calendar query
 *
 * This script:
 * 1. Calls the blockDates mutation endpoint directly (server-to-server)
 * 2. Logs the full HTTP response
 * 3. Immediately queries the calendar endpoint
 * 4. Checks if the newly created event appears in results
 * 5. Reports PASS/FAIL with detailed diff
 *
 * Usage:
 *   NODE_ENV=production pnpm ts-node scripts/diagnose-blockdates.ts
 *   Or against local dev:
 *   pnpm ts-node scripts/diagnose-blockdates.ts
 */

// Use built-in fetch (Node 18+)

const BASE_URL = process.env.BASE_URL || 'https://riverslodgehunt.com';
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || '';
const TEST_USER_ID = 'test-user-' + Date.now();
const TEST_EVENT_ID = 'diag-' + Date.now();

interface BlockDatesPayload {
  startDate: string;
  endDate: string;
  title: string;
  kind: 'blocked';
  startAt: null | string;
  endAt: null | string;
  allDay: boolean;
  reason: 'other';
  reasonNotes: null | string;
  scope: 'entire_property';
  scopeTarget: null | string;
}

interface CalendarQueryInput {
  startDate: string;
  endDate: string;
}

/**
 * Call tRPC mutation endpoint
 */
async function callBlockDatesMutation(payload: BlockDatesPayload) {
  console.log('\n=== STEP 1: Call blockDates mutation ===');
  console.log('Payload:', JSON.stringify(payload, null, 2));

  const response = await fetch(`${BASE_URL}/trpc/portal.calendar.blockDates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      json: payload,
    }),
  });

  const statusText = response.statusText;
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  let body: any;

  try {
    body = await response.json();
  } catch (e) {
    body = await response.text();
  }

  console.log(`Response Status: ${response.status} ${statusText}`);
  console.log('Response Headers:', JSON.stringify(headers, null, 2));
  console.log('Response Body:', JSON.stringify(body, null, 2));

  if (response.status !== 200) {
    console.error(`❌ FAILED: HTTP ${response.status}`);
    return null;
  }

  // Extract result from tRPC response format
  const result = body.result?.data || body;
  console.log('Extracted result:', JSON.stringify(result, null, 2));

  return result;
}

/**
 * Call calendar.events query endpoint
 */
async function callCalendarEventsQuery(input: CalendarQueryInput) {
  console.log('\n=== STEP 2: Query calendar events ===');
  console.log('Query input:', JSON.stringify(input, null, 2));

  // tRPC queries use GET with URLSearchParams
  const params = new URLSearchParams({
    input: JSON.stringify(input),
  });

  const response = await fetch(
    `${BASE_URL}/trpc/portal.calendar.events?${params}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  const statusText = response.statusText;
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  let body: any;

  try {
    body = await response.json();
  } catch (e) {
    body = await response.text();
  }

  console.log(`Response Status: ${response.status} ${statusText}`);
  console.log('Response Headers:', JSON.stringify(headers, null, 2));
  console.log('Response Body (full):', JSON.stringify(body, null, 2));

  if (response.status !== 200) {
    console.error(`❌ FAILED: HTTP ${response.status}`);
    return null;
  }

  // Extract result from tRPC response format
  const result = body.result?.data || body;
  return result;
}

/**
 * Check if event appears in calendar response
 */
function findEventInCalendar(
  calendarData: any,
  testTitle: string
): { found: boolean; event?: any; location?: string } {
  if (!calendarData) {
    return { found: false };
  }

  // Check each event type
  const types = ['weddings', 'corporate', 'huntFish', 'blocked'];

  for (const type of types) {
    const events = calendarData[type] || [];
    const found = events.find((e: any) => {
      // Check title field
      if (e.title === testTitle) return true;
      // For blocked events, also check reason/reasonNotes
      if (type === 'blocked' && (e.reason === testTitle || e.reasonNotes?.includes(testTitle))) {
        return true;
      }
      return false;
    });

    if (found) {
      return { found: true, event: found, location: `${type}[...]` };
    }
  }

  return { found: false };
}

/**
 * Main diagnostic flow
 */
async function runDiagnostics() {
  console.log('🔍 blockDates End-to-End Diagnostic Script');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test timestamp: ${new Date().toISOString()}`);

  // Build test payload matching what PortalCalendar modal sends
  const testDate = '2026-07-20';
  const testTitle = `DiagTest-${TEST_EVENT_ID}`;

  const payload: BlockDatesPayload = {
    startDate: testDate,
    endDate: testDate,
    title: testTitle,
    kind: 'blocked',
    startAt: null,
    endAt: null,
    allDay: true,
    reason: 'other',
    reasonNotes: null,
    scope: 'entire_property',
    scopeTarget: null,
  };

  // Step 1: Call mutation
  let mutationResult: any;
  try {
    mutationResult = await callBlockDatesMutation(payload);
  } catch (err) {
    console.error('❌ Mutation call failed:', err);
    process.exit(1);
  }

  if (!mutationResult) {
    console.error('❌ Mutation returned no result');
    process.exit(1);
  }

  // Check mutation success
  if (!mutationResult.success) {
    console.error(`❌ Mutation indicated failure: ${JSON.stringify(mutationResult)}`);
    process.exit(1);
  }

  console.log(`✅ Mutation succeeded. Event ID: ${mutationResult.id}`);

  // Step 2: Query calendar (July 2026)
  const queryInput: CalendarQueryInput = {
    startDate: '2026-07-01',
    endDate: '2026-07-31',
  };

  let calendarData: any;
  try {
    calendarData = await callCalendarEventsQuery(queryInput);
  } catch (err) {
    console.error('❌ Calendar query failed:', err);
    process.exit(1);
  }

  if (!calendarData) {
    console.error('❌ Calendar query returned no data');
    process.exit(1);
  }

  // Step 3: Check if event appears in results
  console.log('\n=== STEP 3: Verify event appears in calendar ===');

  const { found, event, location } = findEventInCalendar(calendarData, testTitle);

  if (found) {
    console.log(`✅ PASS: Event found in calendar response`);
    console.log(`Location: ${location}`);
    console.log(`Event data:`, JSON.stringify(event, null, 2));
    console.log('\n✅ Full end-to-end flow works! Mutation → Query → Results');
    process.exit(0);
  } else {
    console.error(`❌ FAIL: Event NOT found in calendar response`);
    console.error(`\nSearched for title: ${testTitle}`);
    console.error(`Blocked events found: ${(calendarData.blocked || []).length}`);
    console.error(`Blocked event titles: ${(calendarData.blocked || [])
      .map((e: any) => e.title)
      .slice(0, 10)
      .join(', ')}`);

    console.error('\n❌ Issue identified: Event was created (mutation succeeded) but');
    console.error('calendar query does NOT return it.');
    console.error('\nPossible causes:');
    console.error('1. Query uses different table than mutation writes to');
    console.error('2. Query date filter excludes the event date');
    console.error('3. Query permission/auth issue prevents seeing the event');
    console.error('4. Database replication lag (unlikely for same connection)');

    process.exit(1);
  }
}

// Run diagnostics
runDiagnostics().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
