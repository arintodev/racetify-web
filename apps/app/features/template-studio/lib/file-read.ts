export class FileValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "FileValidationError"
  }
}

export function assertFileSize(
  file: File,
  maxBytes: number,
  label: string
): void {
  if (file.size > maxBytes) {
    const limitMb = (maxBytes / (1024 * 1024)).toFixed(1)
    throw new FileValidationError(`${label} must be ${limitMb} MB or smaller.`)
  }
}

export function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Could not read the file."))
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
      } else {
        reject(new Error("Could not read the file."))
      }
    }
    reader.readAsDataURL(file)
  })
}

export function readFileAsText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Could not read the file."))
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
      } else {
        reject(new Error("Could not read the file."))
      }
    }
    reader.readAsText(file)
  })
}

export function fileExtension(name: string): string {
  const index = name.lastIndexOf(".")
  return index >= 0 ? name.slice(index + 1).toLowerCase() : ""
}

export function imageDimensions(
  dataUrl: string
): Promise<{ widthPx: number; heightPx: number }> {
  return new Promise((resolve, reject) => {
    const image = new window.Image()
    image.onerror = () => reject(new Error("Could not read the image."))
    image.onload = () =>
      resolve({ widthPx: image.naturalWidth, heightPx: image.naturalHeight })
    image.src = dataUrl
  })
}

export function estimateDataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",")
  if (comma < 0) return 0
  const base64 = dataUrl.slice(comma + 1)
  return Math.floor((base64.length * 3) / 4)
}
