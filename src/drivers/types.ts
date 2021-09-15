/**
 * A subset of a texel that identifies it.
 */
export interface TexelId {
  domain: string;
  key: string;
  locale: string;
}

/**
 * This is the most basic text element.
 */
export interface Texel extends TexelId {
  domain: string;
  publicUrl?: string;
  path?: string;
  key: string;
  locale: string;
  value: string | undefined;
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

/**
 * Compares 2 texels or texel id's
 */
export function sameTexelId(t1: TexelId, t2: TexelId) {
  return t1.key === t2.key
    && t1.domain === t2.domain
    && t1.locale === t2.locale;
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
  list(id: Project["id"]): Promise<Texel[]>;

  /**
   * Update the provided texel groups.
   * If the variants of a TexelGroup are empty, then this texel group will be deleted.
   */
  update(id: Project["id"], groups: Texel[]): Promise<void>;
}
