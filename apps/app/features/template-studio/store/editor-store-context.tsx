"use client"

import * as React from "react"
import { useStore } from "zustand"
import type { StoreApi } from "zustand/vanilla"

import type { TemplateDocument } from "../model/template-document"

import {
  createEditorStore,
  type EditorStore,
} from "./editor-store"

const EditorStoreContext = React.createContext<StoreApi<EditorStore> | null>(
  null
)

export function EditorStoreProvider({
  document,
  children,
}: {
  document: TemplateDocument
  children: React.ReactNode
}) {
  const [store] = React.useState(() => createEditorStore(document))

  return (
    <EditorStoreContext.Provider value={store}>
      {children}
    </EditorStoreContext.Provider>
  )
}

export function useEditorStoreApi(): StoreApi<EditorStore> {
  const store = React.useContext(EditorStoreContext)
  if (!store) {
    throw new Error("useEditorStoreApi must be used inside EditorStoreProvider")
  }
  return store
}

export function useEditorStore<T>(selector: (state: EditorStore) => T): T {
  return useStore(useEditorStoreApi(), selector)
}
