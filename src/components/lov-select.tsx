import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type LovOption<T extends string = string> = {
    value: T
    label: string
    /** Muted text after the label, e.g. "(site default)" */
    hint?: string
}

/**
 * A Select for a list of values (sites, collection points, enums...).
 * The value is a plain string where "" means nothing is chosen, and the trigger shows the
 * option's label instead of the raw code. Pass `clearLabel` for filters that can go back to "all".
 */
export function LovSelect<T extends string = string>({
    id,
    value,
    onValueChange,
    options,
    placeholder = "Select",
    clearLabel,
    disabled,
    invalid,
    size,
    className,
    "aria-label": ariaLabel,
}: {
    id?: string
    value: T | ""
    onValueChange: (value: T | "") => void
    options: LovOption<T>[]
    placeholder?: string
    clearLabel?: string
    disabled?: boolean
    invalid?: boolean
    size?: "sm" | "default"
    className?: string
    "aria-label"?: string
}) {
    const labelOf = (selected: string | null) => {
        if (!selected) return clearLabel ?? placeholder
        // Fall back to the code while the options are still loading
        return options.find((option) => option.value === selected)?.label ?? selected
    }

    return (
        <Select
            value={value || null}
            onValueChange={(next) => onValueChange((next ?? "") as T | "")}
            disabled={disabled}
        >
            <SelectTrigger
                id={id}
                size={size}
                aria-label={ariaLabel}
                aria-invalid={invalid || undefined}
                className={cn("w-full bg-background", className)}
            >
                <SelectValue placeholder={clearLabel ?? placeholder}>
                    {(selected: string | null) => labelOf(selected)}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {clearLabel && <SelectItem value={null}>{clearLabel}</SelectItem>}
                {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                        {option.hint && <span className="text-muted-foreground">{option.hint}</span>}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
