// Posts this browser has opened, for series progress ("3 of 6 read"). Local only, no account needed.
const KEY = 'read_posts';
const MAX = 500;

export function getReadPosts(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'));
  } catch {
    return new Set();
  }
}

export function markPostRead(postId: string) {
  try {
    const ids = [...getReadPosts()].filter((id) => id !== postId);
    ids.push(postId);
    localStorage.setItem(KEY, JSON.stringify(ids.slice(-MAX)));
  } catch {
    // Storage blocked or full: progress is a convenience
  }
}
