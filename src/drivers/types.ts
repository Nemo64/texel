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

/**
 * Create a string representation of the texels id part.
 */
export function stringTexelId(texel: TexelId) {
  return JSON.stringify([texel.domain, texel.key, texel.locale]);
}

/**
 * Merges texels.
 * This means duplicate domain-key-locale combos are deleted.
 * The last texel wins on duplicate.
 * Texels with an undefined value are deleted.
 */
export function uniqueTexels(...texels: Texel[]): Texel[] {
  const result = new Map<string, Texel>();
  for (const texel of texels) {
    if (texel.value !== undefined) {
      result.set(stringTexelId(texel), texel);
    } else {
      result.delete(stringTexelId(texel));
    }
  }
  return Array.from(result.values());
}

/**
 * Creates a list of texels where the only items from the first exist,
 * that don't exist in the second list.
 */
export function subtractTexels(baseTexels: Texel[], subtractTexels: Texel[]): Texel[] {
  const result = new Map<string, Texel>();
  for (const texel of baseTexels) {
    result.set(stringTexelId(texel), texel);
  }
  for (const texel of subtractTexels) {
    result.delete(stringTexelId(texel));
  }
  return Array.from(result.values());
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
