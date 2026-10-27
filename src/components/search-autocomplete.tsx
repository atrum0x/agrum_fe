import { Autocomplete } from "@base-ui/react/autocomplete"
import { Input } from "@/components/ui/input"

export type AutocompleteOption = {
    /** Put in the input when the option is picked */
    value: string
    description?: string
}

const matches = (option: AutocompleteOption, query: string) => {
    const term = query.trim().toLowerCase()
    return !term
        || option.value.toLowerCase().includes(term)
        || Boolean(option.description?.toLowerCase().includes(term))
}

/**
 * A free-text input with a list of suggestions (an LOV you can also type past).
 * The value is always the input text, so a partial code or name works as a search term.
 * There is no shadcn autocomplete for base-nova, so this wraps Base UI's Autocomplete in the shadcn styles.
 */
export const SearchAutocomplete = ({
    id,
    value,
    onValueChange,
    options,
    placeholder,
    emptyText = "No matches. The text you typed is still used as the filter.",
    // Set when the options are already filtered on the server
    filterOnServer = false,
}: {
    id?: string
    value: string
    onValueChange: (value: string) => void
    options: AutocompleteOption[]
    placeholder?: string
    emptyText?: string
    filterOnServer?: boolean
}) => (
    <Autocomplete.Root
        items={options}
        value={value}
        onValueChange={onValueChange}
        itemToStringValue={(option: AutocompleteOption) => option.value}
        filter={filterOnServer ? null : matches}
        // Long lists (all employees) stay quick to render; typing narrows them
        limit={50}
    >
        <Autocomplete.Input render={<Input id={id} placeholder={placeholder} />} />
        <Autocomplete.Portal>
            <Autocomplete.Positioner sideOffset={4} className="isolate z-50">
                <Autocomplete.Popup className="max-h-[min(var(--available-height),18rem)] w-(--anchor-width) overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 empty:hidden">
                    <Autocomplete.Empty className="px-1.5 py-1 text-sm text-muted-foreground empty:hidden">
                        {emptyText}
                    </Autocomplete.Empty>
                    <Autocomplete.List>
                        {(option: AutocompleteOption) => (
                            <Autocomplete.Item
                                key={option.value}
                                value={option}
                                className="flex w-full cursor-default flex-col rounded-md px-1.5 py-1 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                            >
                                <span className="font-medium">{option.value}</span>
                                {option.description && (
                                    <span className="text-sm text-muted-foreground">{option.description}</span>
                                )}
                            </Autocomplete.Item>
                        )}
                    </Autocomplete.List>
                </Autocomplete.Popup>
            </Autocomplete.Positioner>
        </Autocomplete.Portal>
    </Autocomplete.Root>
)
