export const serializeQueryParams = (
  params: Record<string, unknown> | undefined,
): string => {
  const searchParams = new URLSearchParams()

  const appendValue = (key: string, value: unknown) => {
    if (value === undefined) return

    if (Array.isArray(value)) {
      value.forEach((item) => appendValue(key, item))
      return
    }

    if (value !== null && typeof value === "object") {
      Object.entries(value).forEach(([nestedKey, nestedValue]) => {
        appendValue(`${key}.${nestedKey}`, nestedValue)
      })
      return
    }

    searchParams.append(key, value === null ? "null" : String(value))
  }

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (key === "pageable" && value !== null && typeof value === "object") {
      Object.entries(value).forEach(([pageableKey, pageableValue]) => {
        appendValue(pageableKey, pageableValue)
      })
    } else {
      appendValue(key, value)
    }
  })

  return searchParams.toString()
}
