/**
 * This is the smallest text element.
 * It has a language and an author.
 */
export interface Texel {
  locale: string;
  value: string;
  history: TexelHistory[]
}

/**
 * A history entry for a {@see Texel}.
 */
export interface TexelHistory {
  value: string;
  date: Date;
  author: string;
  message: string;
}

/**
 * All locales of a {@see Texel}.
 */
export interface TexelGroup {
  key: string;
  domain?: string;
  variants: Record<string, Texel>;
}

/**
 * An abstraction over "repository" and "branches".
 * Can vary widely on the implementation.
 */
export interface Project {
  id: string;
  name: string;
  parent?: Project;
  leaf: boolean;
}

export interface TexelDriver {
  /**
   * Return the project with the given id
   */
  project(id: Project["id"]): Promise<Project>;

  /**
   * List all directories.
   */
  projects(parent?: Project["id"]): Promise<Project[]>;

  /**
   * List all TexelGroups in the provided branch.
   */
  list(id: Project["id"]): Promise<TexelGroup[]>;

  /**
   * Update the provided texel groups.
   * If the variants of a TexelGroup are empty, then this texel group will be deleted.
   */
  update(groups: Iterable<TexelGroup>): Promise<void>;
}
