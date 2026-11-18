"use client"

import * as React from "react"

import type { EditorEngine } from "./fabric-engine"

const EngineContext =
  React.createContext<React.RefObject<EditorEngine | null> | null>(null)

export function EngineProvider({
  engineRef,
  children,
}: {
  engineRef: React.RefObject<EditorEngine | null>
  children: React.ReactNode
}) {
  return (
    <EngineContext.Provider value={engineRef}>
      {children}
    </EngineContext.Provider>
  )
}

export function useEngineRef(): React.RefObject<EditorEngine | null> {
  const ref = React.useContext(EngineContext)
  if (!ref) {
    throw new Error("useEngineRef must be used inside EngineProvider")
  }
  return ref
}
