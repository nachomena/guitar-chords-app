/**
 * The web build stores songs in localStorage (songStorage.web.ts), which has no
 * schema to migrate — so it's ready immediately. Also asks the browser to keep that
 * storage persistent, so it isn't evicted under storage pressure or (on Safari) after
 * a stretch of not opening the site.
 */
export function useDatabaseMigrations(): { success: boolean; error?: Error } {
  return { success: true };
}

void navigator.storage?.persist?.().catch(() => undefined);
