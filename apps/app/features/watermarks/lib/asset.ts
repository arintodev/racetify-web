export type ImageDimensions = { width: number; height: number }

/** Read intrinsic pixels without mounting an <img>. Falls back to an object URL when needed. */
export async function readImageDimensions(file: File): Promise<ImageDimensions> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file)
      const size = { width: bitmap.width, height: bitmap.height }
      bitmap.close()
      return size
    } catch {
      // Fall through to the <img> path.
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight })
      URL.revokeObjectURL(url)
    }
    image.onerror = () => {
      reject(new Error("Could not read the image."))
      URL.revokeObjectURL(url)
    }
    image.src = url
  })
}
