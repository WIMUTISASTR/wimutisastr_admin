import { useCallback, useMemo, useState } from 'react'
import { z } from 'zod'

type FieldErrors = Record<string, string>

function issuesToFieldErrors(issues: z.ZodIssue[]): FieldErrors {
  const next: FieldErrors = {}
  for (const issue of issues) {
    const key = issue.path.join('.') || '_'
    if (!next[key]) next[key] = issue.message
  }
  return next
}

export function useZodForm<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  initialValues: z.input<TSchema>
) {
  type TInput = z.input<TSchema>
  type TOutput = z.output<TSchema>

  const [values, setValues] = useState<TInput>(initialValues)
  const [errors, setErrors] = useState<FieldErrors>({})

  const setValue = useCallback(<K extends keyof TInput>(key: K, value: TInput[K]) => {
    // Forms in this app use object-like schemas; keep the helper flexible while
    // satisfying TS when TInput is not inferred as an object.
    setValues((prev) => ({ ...(prev as Record<string, unknown>), [String(key)]: value } as TInput))
    setErrors((prev) => {
      if (!prev[String(key)]) return prev
      const { [String(key)]: _removed, ...rest } = prev
      return rest
    })
  }, [])

  const reset = useCallback((nextValues: TInput) => {
    setValues(nextValues)
    setErrors({})
  }, [])

  const validate = useCallback(
    (data: unknown = values): { success: true; data: TOutput } | { success: false; errors: FieldErrors } => {
      const result = schema.safeParse(data)
      if (result.success) {
        setErrors({})
        return { success: true, data: result.data }
      }
      const nextErrors = issuesToFieldErrors(result.error.issues)
      setErrors(nextErrors)
      return { success: false, errors: nextErrors }
    },
    [schema, values]
  )

  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors])

  return {
    values,
    setValues,
    setValue,
    errors,
    setErrors,
    reset,
    validate,
    isValid,
  }
}


