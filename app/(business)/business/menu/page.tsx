"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Plus, Pencil, Trash2, Upload, ChevronDown, ChevronUp, Loader2, Save } from "lucide-react"

interface Mod { type: string; item: string }
interface MenuItem {
  id: string
  name: string
  aliases?: string[]
  description?: string
  active?: boolean
  prices?: Record<string, number>
}
interface MenuCategory {
  id: string
  name: string
  items: MenuItem[]
  expanded?: boolean
}

function generateId() { return Math.random().toString(36).slice(2) }

export default function MenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [editItem, setEditItem] = useState<{ catId: string; item: MenuItem } | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: staff } = await supabase.from("businesses_staff").select("business_id").eq("user_id", user.id).single()
      if (!staff?.business_id) return
      setBusinessId(staff.business_id)
      const { data: biz } = await supabase.from("businesses").select("menu").eq("id", staff.business_id).single()
      if (biz?.menu?.categories) {
        setCategories(biz.menu.categories.map((c: any) => ({ ...c, id: c.id ?? generateId(), expanded: true })))
      }
    }
    load()
  }, [])

  const mark = () => setIsDirty(true)

  const handleSave = async () => {
    if (!businessId) return
    setSaving(true)
    const res = await fetch("/api/business/menu", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business_id: businessId, menu: { categories } }),
    })
    setSaving(false)
    if (res.ok) {
      setIsDirty(false)
      setSavedAt(new Date().toLocaleTimeString())
    }
  }

  const handleMenuUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append("image", file)
    const res = await fetch("/api/menu/extract", { method: "POST", body: formData })
    const data = await res.json()
    if (data.categories) {
      setCategories(data.categories.map((c: any) => ({ ...c, id: c.id ?? generateId(), expanded: true })))
      mark()
    }
    setUploading(false)
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
    setCategories((prev) => prev.map((c) => c.id === catId ? { ...c, name } : c))
    mark()
  }

  const toggleCategory = (catId: string) => {
    setCategories((prev) => prev.map((c) => c.id === catId ? { ...c, expanded: !c.expanded } : c))
  }

  const saveItem = (catId: string, item: MenuItem) => {
    setCategories((prev) => prev.map((c) => {
      if (c.id !== catId) return c
      const exists = c.items.find((i) => i.id === item.id)
      return {
        ...c,
        items: exists ? c.items.map((i) => i.id === item.id ? item : i) : [...c.items, item],
      }
    }))
    setEditItem(null)
    mark()
  }

  const removeItem = (catId: string, itemId: string) => {
    setCategories((prev) => prev.map((c) => c.id === catId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c))
    mark()
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Menu Manager</h1>
          {savedAt && <p className="text-muted-foreground text-xs mt-1">Last saved at {savedAt}</p>}
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="menu-upload" className="cursor-pointer">
            <Button variant="outline" asChild disabled={uploading}>
              <span>
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Upload Menu Photo
              </span>
            </Button>
          </Label>
          <input id="menu-upload" type="file" accept="image/*" className="hidden" onChange={handleMenuUpload} />
          <Button onClick={handleSave} disabled={saving || !isDirty} className={isDirty ? "bg-green-600 hover:bg-green-700" : ""}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {isDirty ? "Save Changes" : "Saved"}
          </Button>
        </div>
      </div>

      {isDirty && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 text-sm text-yellow-600">
          You have unsaved changes. Save to update the AI agent.
        </div>
      )}

      {/* Categories */}
      <div className="space-y-4">
        {categories.map((cat) => (
          <Card key={cat.id} className="border-border">
            <div className="flex items-center justify-between px-6 py-4 cursor-pointer" onClick={() => toggleCategory(cat.id)}>
              <div className="flex items-center gap-3 flex-1">
                <Input
                  value={cat.name}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => updateCategoryName(cat.id, e.target.value)}
                  className="h-8 font-semibold bg-transparent border-transparent hover:border-input focus:border-input w-48"
                />
                <Badge variant="secondary">{cat.items.length} items</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removeCategory(cat.id) }} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
                {cat.expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>

            {cat.expanded && (
              <CardContent className="pt-0">
                <div className="divide-y divide-border border-t border-border">
                  {cat.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Switch checked={item.active !== false} onCheckedChange={(v) => saveItem(cat.id, { ...item, active: v })} />
                        <div>
                          <p className={`font-medium text-sm ${item.active === false ? "text-muted-foreground line-through" : ""}`}>{item.name}</p>
                          {item.aliases && item.aliases.length > 0 && (
                            <p className="text-xs text-muted-foreground">{item.aliases.join(", ")}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditItem({ catId: cat.id, item })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => removeItem(cat.id, item.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-muted-foreground"
                  onClick={() => setEditItem({ catId: cat.id, item: { id: generateId(), name: "", active: true } })}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </CardContent>
            )}
          </Card>
        ))}

        <Button variant="outline" onClick={addCategory} className="w-full">
          <Plus className="h-4 w-4 mr-2" /> Add Category
        </Button>
      </div>

      {/* Item Edit Modal */}
      {editItem && (
        <ItemModal
          item={editItem.item}
          onSave={(item) => saveItem(editItem.catId, item)}
          onClose={() => setEditItem(null)}
        />
      )}
    </div>
  )
}

function ItemModal({ item, onSave, onClose }: { item: MenuItem; onSave: (item: MenuItem) => void; onClose: () => void }) {
  const [form, setForm] = useState<MenuItem>({ ...item })
  const [aliasInput, setAliasInput] = useState(item.aliases?.join(", ") ?? "")

  const handleSave = () => {
    onSave({
      ...form,
      aliases: aliasInput.split(",").map((s) => s.trim()).filter(Boolean),
    })
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item.name ? `Edit: ${item.name}` : "Add Item"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Item Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Michelangelo" />
          </div>
          <div className="space-y-2">
            <Label>Aliases (comma separated)</Label>
            <Input value={aliasInput} onChange={(e) => setAliasInput(e.target.value)} placeholder="mike, mikey, michael angelo" />
            <p className="text-xs text-muted-foreground">What customers might say instead of the full name</p>
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Buffalo chicken cutlet, steak, american cheese" />
          </div>
          <div className="space-y-2">
            <Label>Pricing</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "hard_roll_6inch", label: "Hard Roll / 6\"" },
                { key: "wrap", label: "Wrap" },
                { key: "12inch", label: "12\" Sub" },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      step="0.25"
                      value={form.prices?.[key] ?? ""}
                      onChange={(e) => setForm({ ...form, prices: { ...form.prices, [key]: parseFloat(e.target.value) } })}
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
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.name}>Save Item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
