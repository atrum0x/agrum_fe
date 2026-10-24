import { format, parseISO } from "date-fns"
import type { LovOption } from "@/components/lov-select"

// Labels and display formats shared by the weight screens (FSD section 1)

export type AttendanceCategory = "REGULAR" | "SEASONAL" | "LENT" | "BORROWED"
export type EntryType = "AUTOMATIC" | "MANUAL"
export type LineState = "RECORDED" | "CANCELLED"
export type ApprovalStatus = "RECORDED" | "PENDING_AUTHORIZATION" | "APPROVED" | "DISAPPROVED"
export type ChangeType = "CORRECTION" | "CANCELLATION"
export type DayClassification = "HALF_DAY" | "FULL_DAY"

export const categoryLabels: Record<AttendanceCategory, string> = {
    REGULAR: "Regular",
    SEASONAL: "Seasonal",
    LENT: "Lent",
    BORROWED: "Borrowed",
}

export const entryTypeLabels: Record<EntryType, string> = {
    AUTOMATIC: "Automatic",
    MANUAL: "Manual",
}

export const lineStateLabels: Record<LineState, string> = {
    RECORDED: "Recorded",
    CANCELLED: "Cancelled",
}

export const approvalStatusLabels: Record<ApprovalStatus, string> = {
    RECORDED: "Recorded",
    PENDING_AUTHORIZATION: "Pending Authorization",
    APPROVED: "Approved",
    DISAPPROVED: "Disapproved",
}

export const changeTypeLabels: Record<ChangeType, string> = {
    CORRECTION: "Correction",
    CANCELLATION: "Cancellation",
}

export const dayClassificationLabels: Record<DayClassification, string> = {
    HALF_DAY: "Half Day",
    FULL_DAY: "Full Day",
}

export const optionsOf = <T extends string>(labels: Record<T, string>): LovOption<T>[] =>
    (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }))

// parseISO reads a plain yyyy-MM-dd as a local date, not UTC midnight
export const formatDate = (value?: string) => value ? format(parseISO(value), "dd/MM/yyyy") : "—"
export const formatDateTime = (value?: string) => value ? format(parseISO(value), "dd/MM/yyyy HH:mm") : "—"

// Weights in kg with 2 decimals; variance with its sign (+2.00, -2.00)
export const formatKg = (value?: number) => value == null ? "—" : value.toFixed(2)
export const formatVariance = (value?: number) => value == null ? "—" : `${value > 0 ? "+" : ""}${value.toFixed(2)}`

// Same as the server: weight x (100 + variance) / 100, rounded half up to 2 dp
export const afterVariance = (weightKg: number, variancePercent: number) =>
    Math.round(weightKg * (100 + variancePercent) + Number.EPSILON) / 100

// WE-06 / WH-06: more than 0 with at most 2 decimals
export const isValidWeight = (text: string) => /^\d+(\.\d{1,2})?$/.test(text.trim()) && Number(text) > 0

export const toList = <T,>(response: unknown): T[] => {
    if (Array.isArray(response)) return response as T[]
    if (response && typeof response === "object" && "data" in response) {
        return Array.isArray(response.data) ? response.data as T[] : []
    }
    return []
}

// The generated types wrap bodies in { data, status }, but customFetch returns the body itself
export const unwrap = <T,>(response: unknown): T | undefined => {
    if (!response || typeof response !== "object") return undefined
    if ("data" in response && "status" in response) return response.data as T
    return response as T
}

export const blankToUndefined = (value: string) => value.trim() || undefined
