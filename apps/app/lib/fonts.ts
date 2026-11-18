/**
 * Font families the browser can render without a web-font download. Custom event fonts are added on
 * top of this list by the callers that can query them.
 */
export const SYSTEM_FONT_FAMILIES = [
  "Arial",
  "Helvetica",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Verdana",
  "Trebuchet MS",
  "Tahoma",
  "Impact",
  "Roboto",
  "Inter",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Source Sans 3",
] as const

export const FONT_WEIGHTS = [
  { value: 300, label: "Light · 300" },
  { value: 400, label: "Regular · 400" },
  { value: 500, label: "Medium · 500" },
  { value: 600, label: "Semibold · 600" },
  { value: 700, label: "Bold · 700" },
  { value: 800, label: "Extra bold · 800" },
  { value: 900, label: "Black · 900" },
] as const
