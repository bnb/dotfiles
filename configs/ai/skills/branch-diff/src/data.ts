// The JSON `collect` writes and the viewer reads. Shared by both sides, so the
// shape lives here once.

export type FileStatus =
  | "added"
  | "modified"
  | "deleted"
  | "renamed"
  | "copied"
  | "type-changed"
  | "unmerged";

/** Where a change lives relative to the base: on the branch, in the index, or only on disk. */
export type ChangeSource = "committed" | "staged" | "unstaged" | "untracked";

/** How the base was picked: passed in, the remote's default branch, or a local guess. */
export type BaseSource = "argument" | "remote-head" | "default-branch";

export interface ChangedFile {
  path: string;
  /** Previous path for renames and copies. */
  oldPath: string | null;
  status: FileStatus;
  additions: number;
  deletions: number;
  binary: boolean;
  /** Lockfiles and anything marked `linguist-generated`. The viewer collapses these. */
  generated: boolean;
  sources: ChangeSource[];
  /** Unified diff for this file. Null when it was over the size limit. */
  patch: string | null;
}

export interface Commit {
  sha: string;
  subject: string;
  author: string;
  /** ISO 8601 author date. */
  date: string;
}

export interface DiffData {
  version: 1;
  generatedAt: string;
  repo: { name: string; root: string };
  head: { branch: string | null; sha: string };
  base: {
    ref: string;
    sha: string;
    /** The commit the diff is taken against: the merge base, or `sha` itself with --direct. */
    diffFrom: string;
    direct: boolean;
    source: BaseSource;
    /** Commits on the base since the merge base. 0 with --direct. */
    ahead: number;
    /** Whether the base is a remote-tracking branch, like origin/main. */
    remote: boolean;
    /** When the repo last fetched (FETCH_HEAD's mtime), as ISO 8601. Null if it never has. */
    fetchedAt: string | null;
  };
  commits: Commit[];
  files: ChangedFile[];
  totals: { files: number; additions: number; deletions: number };
}
