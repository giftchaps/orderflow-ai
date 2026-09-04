"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Plus, Pencil, Trash2, Upload, ChevronDown, ChevronUp, Loader2, Save } from "lucide-react"
import { api } from "@/lib/api-client"
import type { MenuCategory, MenuDocument, MenuItem } from "@/lib/business-shared"

type EditableItem = MenuItem & { id: string }
type EditableCategory = Omit<MenuCategory, "items"> & { id: string; items: EditableItem[]; expanded?: boolean }

function generateId() {
  return Math.random().toString(36).slice(2)
}

function toEditable(menu: MenuDocument | null): EditableCategory[] {
  return (menu?.categories ?? []).map((c) => ({
    ...c,
    id: c.id ?? generateId(),
    items: c.items.map((i) => ({ ...i, id: i.id ?? generateId() })),
    expanded: true,
  }))
}

export function MenuManager({ initialMenu, canEdit }: { initialMenu: MenuDocument | null; canEdit: boolean }) {
  const [categories, setCategories] = useState<EditableCategory[]>(() => toEditable(initialMenu))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [editItem, setEditItem] = useState<{ catId: string; item: EditableItem } | null>(null)

  const mark = () => setIsDirty(true)

  const handleSave = async () => {
    setSaving(true)
    try {
      await api("/api/business/menu", {
        method: "PUT",
        body: { menu: { categories: categories.map(({ expanded: _expanded, ...c }) => c) } },
      })
      setIsDirty(false)
      setSavedAt(new Date().toLocaleTimeString())
      toast.success("Menu saved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save menu")
    } finally {
      setSaving(false)
    }
  }

  const handleMenuUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploading(true)
    try {
      const formData = new FormData()
      // Multiple files (photos, PDFs, Word docs — e.g. a menu with a front and back,
      // several pages, or a price list plus a couple of photos of specials) are sent
      // together so the model can merge them into one menu instead of overwriting
      // itself once per file.
      for (const file of files) formData.append("files", file)
      const res = await fetch("/api/menu/extract", { method: "POST", body: formData })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; categories?: MenuCategory[] }
      if (!res.ok || data.ok === false) throw new Error(data.error ?? "Could not read a menu from what you uploaded.")
      setCategories(
        (data.categories ?? []).map((c) => ({
          ...c,
          id: c.id ?? generateId(),
          items: c.items.map((i) => ({ ...i, id: i.id ?? generateId() })),
          expanded: true,
        }))
      )
      mark()
      toast.success(files.length > 1 ? `Menu extracted from ${files.length} files — review it, then save` : "Menu extracted — review it, then save")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read what you uploaded")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const addCategory = () => {
    setCategories((prev) => [...prev, { id: generateId(), name: "New Category", items: [], expanded: true }])
    mark()
  }

  const removeCategory = (catId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== catId))
    mark()
  }

  const updateCategoryName = (catId: string, name: string) => {
    setCategories((prev) => prev.map((c) => (c.id === catId ? { ...c, name } : c)))
    mark()
  }

  const toggleCategory = (catId: string) => {
    setCategories((prev) => prev.map((c) => (c.id === catId ? { ...c, expanded: !c.expanded } : c)))
  }

  const saveItem = (catId: string, item: EditableItem) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id !== catId) return c
        const exists = c.items.find((i) => i.id === item.id)
        return { ...c, items: exists ? c.items.map((i) => (i.id === item.id ? item : i)) : [...c.items, item] }
      })
    )
    setEditItem(null)
    mark()
  }

  const removeItem = (catId: string, itemId: string) => {
    setCategories((prev) => prev.map((c) => (c.id === catId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c)))
    mark()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {savedAt && <p className="text-xs text-muted-foreground">Last saved at {savedAt}</p>}
          {!canEdit && <p className="text-xs text-muted-foreground">You have view-only access to the menu.</p>}
          {canEdit && !savedAt && (
            <p className="text-xs text-muted-foreground">Photos, PDFs, or Word (.docx) — upload several at once to combine them.</p>
          )}
        </div>
        {canEdit && (
          <div className="flex items-center gap-3">
            <Label htmlFor="menu-upload" className="cursor-pointer">
              <Button variant="outline" asChild disabled={uploading}>
                <span>
                  {uploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
                  Upload menu files
                </span>
              </Button>
            </Label>
            <input
              id="menu-upload"
              type="file"
              accept="image/*,.pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.txt,.csv,text/plain,text/csv"
              multiple
              className="hidden"
              onChange={handleMenuUpload}
            />
            <Button onClick={handleSave} disabled={saving || !isDirty}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
              {isDirty ? "Save changes" : "Saved"}
            </Button>
          </div>
        )}
      </div>

      {canEdit && isDirty && (
        <div className="rounded-lg border border-warning/30 bg-status-pending-bg px-4 py-3 text-sm text-warning-foreground">
          You have unsaved changes. Save to update the AI agent.
        </div>
      )}

      <div className="flex flex-col gap-4">
        {categories.map((cat) => (
          <Card key={cat.id} className="shadow-none">
            <div className="flex cursor-pointer items-center justify-between px-6 py-4" onClick={() => toggleCategory(cat.id)}>
              <div className="flex flex-1 items-center gap-3">
                <Input
                  value={cat.name}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => updateCategoryName(cat.id, e.target.value)}
                  className="h-8 w-48 border-transparent bg-transparent font-semibold hover:border-input focus:border-input"
                  disabled={!canEdit}
                />
                <Badge variant="secondary">{cat.items.length} items</Badge>
              </div>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeCategory(cat.id)
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
                {cat.expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
              </div>
            </div>

            {cat.expanded && (
              <CardContent className="pt-0">
                <div className="divide-y divide-border border-t border-border">
                  {cat.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={item.active !== false}
                          onCheckedChange={(v) => saveItem(cat.id, { ...item, active: v })}
                          disabled={!canEdit}
                        />
                        <div>
                          <p className={`text-sm font-medium ${item.active === false ? "text-muted-foreground line-through" : ""}`}>
                            {item.name}
                          </p>
                          {item.aliases && item.aliases.length > 0 && (
                            <p className="text-xs text-muted-foreground">{item.aliases.join(", ")}</p>
                          )}
                        </div>
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setEditItem({ catId: cat.id, item })}>
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => removeItem(cat.id, item.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {cat.items.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No items yet</p>}
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-muted-foreground"
                    onClick={() => setEditItem({ catId: cat.id, item: { id: generateId(), name: "", active: true } })}
                  >
                    <Plus className="mr-1 size-4" /> Add item
                  </Button>
                )}
              </CardContent>
            )}
          </Card>
        ))}

        {categories.length === 0 && (
          <Card className="shadow-none">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No menu yet. {canEdit ? "Upload a photo or add a category to get started." : "Ask an owner or manager to set one up."}
            </CardContent>
          </Card>
        )}

        {canEdit && (
          <Button variant="outline" onClick={addCategory} className="w-full">
            <Plus className="mr-2 size-4" /> Add category
          </Button>
        )}
      </div>

      {editItem && <ItemModal item={editItem.item} onSave={(item) => saveItem(editItem.catId, item)} onClose={() => setEditItem(null)} />}
    </div>
  )
}

function ItemModal({ item, onSave, onClose }: { item: EditableItem; onSave: (item: EditableItem) => void; onClose: () => void }) {
  const [form, setForm] = useState<EditableItem>({ ...item })
  const [aliasInput, setAliasInput] = useState(item.aliases?.join(", ") ?? "")

  const handleSave = () => {
    onSave({ ...form, aliases: aliasInput.split(",").map((s) => s.trim()).filter(Boolean) })
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item.name ? `Edit: ${item.name}` : "Add item"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label>Item name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Michelangelo" />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Aliases (comma separated)</Label>
            <Input value={aliasInput} onChange={(e) => setAliasInput(e.target.value)} placeholder="mike, mikey, michael angelo" />
            <p className="text-xs text-muted-foreground">What customers might say instead of the full name</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Description (optional)</Label>
            <Input
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Buffalo chicken cutlet, steak, american cheese"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Pricing</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "hard_roll_6inch", label: 'Hard roll / 6"' },
                { key: "wrap", label: "Wrap" },
                { key: "12inch", label: '12" sub' },
              ].map(({ key, label }) => (
                <div key={key} className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step="0.25"
                      value={form.prices?.[key] ?? ""}
                      onChange={(e) => setForm({ ...form, prices: { ...form.prices, [key]: Number.parseFloat(e.target.value) } })}
                      className="h-8"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.active !== false} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            <Label>Item is available</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!form.name}>
            Save item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
