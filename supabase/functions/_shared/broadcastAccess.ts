export interface BroadcastSessionOwner {
  user_id: string;
}

/** Defense in depth alongside the database's user-scoped query and RLS. */
export function isOwnedBroadcastSession(
  session: BroadcastSessionOwner | null,
  userId: string,
): boolean {
  return session?.user_id === userId;
}
