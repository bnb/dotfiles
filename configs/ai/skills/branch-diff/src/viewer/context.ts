import { createContext, useContext } from "react";
import type { DiffData } from "../data.ts";

export type Layout = "unified" | "split";

export interface ViewerContext {
  data: DiffData;
  layout: Layout;
  /** Language ids the page has grammars for. */
  languages: ReadonlySet<string>;
  /** Whether diffs wait until they're scrolled near before rendering. */
  lazy: boolean;
}

export const Viewer = createContext<ViewerContext | null>(null);

export function useViewer(): ViewerContext {
  const viewer = useContext(Viewer);
  if (!viewer) throw new Error("useViewer needs a Viewer provider");
  return viewer;
}

/** Element id for a file's diff, and the hash that links to it. */
export const fileAnchor = (path: string) => `file:${path}`;
export const fileHref = (path: string) => `#${encodeURIComponent(fileAnchor(path))}`;
