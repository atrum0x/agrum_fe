import type { LovOption } from "@/components/lov-select"

// Options for the usual LOVs, so every screen labels them the same way

export const estateOptions = (estates: { id?: string; name?: string }[]): LovOption[] =>
    estates.filter((estate) => estate.id).map((estate) => ({ value: estate.id!, label: estate.name || estate.id! }))

export const divisionOptions = (divisions: { divisionCode?: string; description?: string }[]): LovOption[] =>
    divisions.filter((division) => division.divisionCode).map((division) => ({
        value: division.divisionCode!,
        label: codeAndText(division.divisionCode!, division.description),
    }))

export const fieldOptions = (fields: { fieldCode?: string; description?: string }[]): LovOption[] =>
    fields.filter((field) => field.fieldCode).map((field) => ({
        value: field.fieldCode!,
        label: codeAndText(field.fieldCode!, field.description),
    }))

export const workTypeOptions = (workTypes: { workTypeCode?: string; name?: string }[]): LovOption[] =>
    workTypes.filter((item) => item.workTypeCode).map((item) => ({
        value: item.workTypeCode!,
        label: codeAndText(item.workTypeCode!, item.name),
    }))

/** "CODE – description" in lists and grid cells; the code alone when there is no description. */
export const codeAndText = (code: string, text?: string | null): string =>
    text && text !== code ? `${code} – ${text}` : code
