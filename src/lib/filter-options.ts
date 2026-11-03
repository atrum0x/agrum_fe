import type { AutocompleteOption } from "@/components/search-autocomplete"
import type { FilterOptionDto } from "@/api/generated/models"

/** Turns a filter-options response (code + name) into search-autocomplete suggestions */
export const toAutocompleteOptions = (response: unknown): AutocompleteOption[] =>
    (Array.isArray(response) ? (response as FilterOptionDto[]) : [])
        .filter((option) => option.value)
        .map((option) => ({ value: option.value!, description: option.description || undefined }))
