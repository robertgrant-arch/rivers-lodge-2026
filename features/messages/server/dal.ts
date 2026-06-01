// Data-access helpers for the messages (concierge) feature.
// These are thin re-exports from the core DB module so the messages feature
// owns a stable import boundary without duplicating SQL.
export {
  getMessagesForUser,
  getAllMessages,
  createMessage,
  markMessageRead,
  archiveMessage,
  unarchiveMessage,
} from "../../_core/server/db";
