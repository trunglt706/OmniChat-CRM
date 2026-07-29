'use client'

import { useState, useEffect, useRef } from 'react'
import { useCRMStore, type UserProfile } from '@/store/crm-store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  User, Mail, Phone, Briefcase, MessageSquare, Camera, Check, X, Shield, Clock,
} from 'lucide-react'

const GRADIENT_CLASSES = ['avatar-gradient-1', 'avatar-gradient-2', 'avatar-gradient-3', 'avatar-gradient-4', 'avatar-gradient-5', 'avatar-gradient-6']

const STATUS_OPTIONS: { value: UserProfile['status']; label: string; color: string }[] = [
  { value: 'online', label: 'Truc tuyen', color: 'bg-emerald-500' },
  { value: 'busy', label: 'Ban', color: 'bg-amber-500' },
  { value: 'away', label: 'Vang mat', color: 'bg-orange-400' },
  { value: 'offline', label: 'Ngoai tuyen', color: 'bg-gray-400' },
]

export default function ProfilePanel() {
  const { currentUser, setCurrentUser, settings, setOpenSheet } = useCRMStore()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', bio: '' })
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (currentUser) {
      setForm({ name: currentUser.name, email: currentUser.email, phone: currentUser.phone, bio: currentUser.bio })
    }
  }, [currentUser])

  const handleSave = () => {
    if (!currentUser) return
    setCurrentUser({ ...currentUser, ...form })
    setEditing(false)
  }

  const handleCancel = () => {
    if (currentUser) {
      setForm({ name: currentUser.name, email: currentUser.email, phone: currentUser.phone, bio: currentUser.bio })
    }
    setEditing(false)
  }

  const handleStatusChange = (status: UserProfile['status']) => {
    if (!currentUser) return
    setCurrentUser({ ...currentUser, status })
  }

  if (!currentUser) return null

  return (
    <div className="flex flex-col h-full min-h-0 animate-slide-up">
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-base font-bold tracking-tight">Ho so cua toi</h2>
      </div>
      <Separator className="opacity-40" />

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Avatar + Name card */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <Avatar className={cn('h-20 w-20 ring-4 ring-background shadow-xl', GRADIENT_CLASSES[0])}>
                <AvatarFallback className="text-2xl text-white font-bold">
                  {currentUser.name.split(' ').slice(-2).map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100"
              >
                <Camera className="h-5 w-5 text-white" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={() => {}} />
            </div>

            {!editing ? (
              <div className="text-center">
                <h3 className="text-lg font-bold tracking-tight">{currentUser.name}</h3>
                <p className="text-xs text-muted-foreground/60 mt-1 font-medium">{currentUser.email}</p>
                <span className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-medium px-2.5 py-1 rounded-full bg-foreground/[0.04] text-muted-foreground/70">
                  <Shield className="h-3 w-3" />
                  {currentUser.role === 'admin' ? 'Quan tri vien' : currentUser.role === 'agent' ? 'Nhan vien' : currentUser.role}
                </span>
              </div>
            ) : null}

            {/* Status selector */}
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleStatusChange(opt.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all duration-200 border',
                    currentUser.status === opt.value
                      ? 'border-primary/30 bg-primary/5 text-primary'
                      : 'border-transparent text-muted-foreground/50 hover:text-foreground hover:bg-foreground/[0.03]'
                  )}
                >
                  <span className={cn('h-2 w-2 rounded-full', opt.color, currentUser.status === opt.value && 'shadow-sm')} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Profile form */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.15em] px-1">
            Thong tin ca nhan
          </h4>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground/70">Ten hien thi</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                disabled={!editing}
                className="rounded-xl glass-input h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground/70">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                disabled={!editing}
                className="rounded-xl glass-input h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground/70">So dien thoai</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                disabled={!editing}
                className="rounded-xl glass-input h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground/70">Tieu su</Label>
              <Textarea
                value={form.bio}
                onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))}
                disabled={!editing}
                className="rounded-xl glass-input min-h-[70px] resize-none text-sm"
              />
            </div>
          </div>

          {/* Edit/Save buttons */}
          {!editing ? (
            <Button
              onClick={() => setEditing(true)}
              className="w-full h-10 rounded-xl text-sm font-medium"
            >
              Chinh sua thong tin
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1 h-10 rounded-xl text-sm font-medium"
              >
                <X className="h-4 w-4 mr-1.5" /> Huy
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 h-10 rounded-xl text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600"
              >
                <Check className="h-4 w-4 mr-1.5" /> Luu
              </Button>
            </div>
          )}
        </div>

        {/* Stats card */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.15em] px-1">
            Thong ke hoat dong
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Hoi thoai hom nay', value: '12', icon: MessageSquare },
              { label: 'TB trung binh phan hoi', value: '2m 30s', icon: Clock },
              { label: 'Danh gia tb', value: '4.8/5', icon: Shield },
              { label: 'Tong hoi thoai', value: '1,247', icon: User },
            ].map((stat) => (
              <div key={stat.label} className="bg-foreground/[0.02] rounded-xl p-3">
                <stat.icon className="h-4 w-4 text-muted-foreground/40 mb-1.5" />
                <p className="text-sm font-bold tabular-nums">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground/50 mt-0.5 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
