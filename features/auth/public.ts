// Auth feature public API
// Only import from here — never from auth internals directly

export type { User, InsertUser, UserRole } from "./types";
export { useAuth } from "./client/useAuth";
export { LoginButton } from "./client/LoginButton";
export { authRouter } from "./server/router";

// Note: schema (users table) is re-exported via @core/db/schema for DB-layer consumers
// DB table refs — for admin feature consumption only
export { users } from '@core/db/schema';
