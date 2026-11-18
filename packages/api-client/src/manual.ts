/**
 * Temporary response types for operations whose OpenAPI response schema is missing.
 *
 * Keep this file small. When the backend adds the missing schema, regenerate the client and move
 * the type to `Schemas` instead of extending this file.
 */
export type UntypedResponse = unknown
