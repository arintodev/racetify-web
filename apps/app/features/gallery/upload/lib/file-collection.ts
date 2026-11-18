export type SelectedFile = {
  file: File
  /** "Race day/Heat 1" for folder picks/drops; null for plain file selections. */
  relativePath: string | null
}

/** Files chosen through an `<input type="file">`, including `webkitdirectory` picks. */
export function fromFileList(files: FileList | null): SelectedFile[] {
  return Array.from(files ?? []).map((file) => ({
    file,
    relativePath: relativePathOf(file),
  }))
}

function relativePathOf(file: File): string | null {
  const path = (file as File & { webkitRelativePath?: string })
    .webkitRelativePath
  if (!path) return null
  const slash = path.lastIndexOf("/")
  return slash === -1 ? null : path.slice(0, slash)
}

/**
 * Collects files from a drag-and-drop, walking dropped folders recursively. Browsers return
 * directory entries in batches, so `readEntries` must be drained until it yields an empty batch.
 */
export async function fromDataTransfer(
  dataTransfer: DataTransfer,
  maxFiles = Number.POSITIVE_INFINITY
): Promise<SelectedFile[]> {
  const entries = Array.from(dataTransfer.items ?? [])
    .filter((item) => item.kind === "file")
    .map((item) => item.webkitGetAsEntry?.() ?? null)
    .filter((entry): entry is FileSystemEntry => entry !== null)

  if (entries.length === 0) {
    return fromFileList(dataTransfer.files).slice(0, maxFiles)
  }

  const collected: SelectedFile[] = []
  for (const entry of entries) {
    if (collected.length >= maxFiles) break
    await walkEntry(
      entry,
      entry.isDirectory ? entry.name : null,
      collected,
      maxFiles
    )
  }
  return collected.slice(0, maxFiles)
}

async function walkEntry(
  entry: FileSystemEntry,
  relativePath: string | null,
  out: SelectedFile[],
  maxFiles: number
): Promise<void> {
  if (out.length >= maxFiles) return

  if (entry.isFile) {
    const file = await readFileEntry(entry as FileSystemFileEntry)
    out.push({ file, relativePath })
    return
  }

  if (entry.isDirectory) {
    const children = await readAllEntries(
      (entry as FileSystemDirectoryEntry).createReader()
    )
    for (const child of children) {
      if (out.length >= maxFiles) return
      const next = relativePath ? `${relativePath}/${child.name}` : child.name
      await walkEntry(child, next, out, maxFiles)
    }
  }
}

function readFileEntry(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject))
}

function readAllEntries(
  reader: FileSystemDirectoryReader
): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const entries: FileSystemEntry[] = []

    const readBatch = () => {
      reader.readEntries((batch) => {
        if (batch.length === 0) {
          resolve(entries)
          return
        }
        entries.push(...batch)
        readBatch()
      }, reject)
    }

    readBatch()
  })
}
