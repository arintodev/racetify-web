import type { TemplateObject } from "./template-document"

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never

/** A partial update for one object type, without changing its identity or kind. */
export type ObjectPatch = Partial<DistributiveOmit<TemplateObject, "id" | "type">>

export function mergeObject(
  object: TemplateObject,
  patch: ObjectPatch
): TemplateObject {
  return { ...object, ...patch } as TemplateObject
}
