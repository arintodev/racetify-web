"use client"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"

import type { LeftTab } from "../store/editor-store"
import { useEditorStore } from "../store/editor-store-context"

import { AddPanel } from "./add-panel"
import { DataPanel } from "./data-panel"
import { LayersPanel } from "./layers-panel"

export function LeftPanel() {
  const leftTab = useEditorStore((state) => state.leftTab)
  const setLeftTab = useEditorStore((state) => state.setLeftTab)
  const preview = useEditorStore((state) => state.preview)

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-background md:flex">
      <Tabs
        value={preview ? "data" : leftTab}
        onValueChange={(value) => {
          if (typeof value === "string") setLeftTab(value as LeftTab)
        }}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className="border-b p-2">
          <TabsList className="w-full">
            <TabsTrigger value="add" className="flex-1" disabled={preview}>
              Add
            </TabsTrigger>
            <TabsTrigger value="layers" className="flex-1" disabled={preview}>
              Layers
            </TabsTrigger>
            <TabsTrigger value="data" className="flex-1">
              Data
            </TabsTrigger>
          </TabsList>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <TabsContent value="add" className="mt-0">
            <AddPanel />
          </TabsContent>
          <TabsContent value="layers" className="mt-0">
            <LayersPanel />
          </TabsContent>
          <TabsContent value="data" className="mt-0">
            <DataPanel />
          </TabsContent>
        </div>
      </Tabs>
    </aside>
  )
}
