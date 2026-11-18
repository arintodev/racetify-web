import { copyFileSync, existsSync, mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const destination = resolve(packageDir, "openapi.yaml")

const candidates = [
  process.env.RACETIFY_OPENAPI_SOURCE,
  resolve(packageDir, "../../../racetify-api/packages/api-contract/openapi.yaml"),
  resolve(packageDir, "../racetify-api/packages/api-contract/openapi.yaml"),
].filter(Boolean)

const source = candidates.find((candidate) => existsSync(candidate))

if (!source) {
  console.error(
    "Could not find the API OpenAPI file. Set RACETIFY_OPENAPI_SOURCE to the generated openapi.yaml."
  )
  process.exit(1)
}

mkdirSync(dirname(destination), { recursive: true })
copyFileSync(source, destination)
console.log(`Synced ${source} -> ${destination}`)
