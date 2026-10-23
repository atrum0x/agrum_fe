import type { LovOption } from "@/components/lov-select"

// Options for the usual LOVs, so every screen labels them the same way

export const estateOptions = (estates: { id?: string; name?: string }[]): LovOption[] =>
    estates.filter((estate) => estate.id).map((estate) => ({ value: estate.id!, label: estate.name || estate.id! }))

export const collectionPointOptions = (points: { cpCode?: string; name?: string }[]): LovOption[] =>
    points.filter((point) => point.cpCode).map((point) => ({
        value: point.cpCode!,
        label: point.name ? `${point.cpCode} – ${point.name}` : point.cpCode!,
    }))

export const workTypeOptions = (workTypes: { workType?: string }[]): LovOption[] =>
    workTypes.filter((item) => item.workType).map((item) => ({ value: item.workType!, label: item.workType! }))
