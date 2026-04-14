import { SAFE_ID_REGEX } from "./validators"

function validateId(value: string, field: string): void {
  if (!SAFE_ID_REGEX.test(value)) {
    throw new Error(`Invalid ${field}: contains unsafe characters`)
  }
}

export type SearchFilterInput = {
  category_id?: string
  collection_id?: string
}

/**
 * Builds a MeiliSearch filter array (AND of single-element arrays).
 * Input IDs are validated against a safe-character allowlist before use.
 */
export function buildSearchFilters(input: SearchFilterInput): string[][] {
  const filters: string[][] = [['status = "published"']]

  if (input.category_id) {
    validateId(input.category_id, "category_id")
    filters.push([`category_ids = "${input.category_id}"`])
  }

  if (input.collection_id) {
    validateId(input.collection_id, "collection_id")
    filters.push([`collection_id = "${input.collection_id}"`])
  }

  return filters
}
