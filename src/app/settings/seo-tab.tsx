import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Save, Loader2, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'
import { useT } from '@/i18n/useT'
import { apiFetch, apiPost } from '@/lib/api-client'

export default function SeoTab() {
  const { t } = useT()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [seo, setSeo] = useState({
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
    seo_logo: '',
  })

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setSeo({
          seo_title: data.seo_title || '',
          seo_description: data.seo_description || '',
          seo_keywords: data.seo_keywords || '',
          seo_logo: data.seo_logo || '',
        })
        setLoading(false)
      })
      .catch(() => {
        toast.error(t('seoConfig.saveError') || 'Lỗi khi tải cấu hình SEO')
        setLoading(false)
      })
  }, [t])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setSeo(prev => ({ ...prev, [name]: value }))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const data = await apiFetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      if (data.url) {
        setSeo(prev => ({ ...prev, seo_logo: data.url }))
        toast.success(t('seoConfig.uploadSuccess'))
      } else {
        toast.error(data.error || t('seoConfig.uploadError'))
      }
    } catch {
      toast.error(t('seoConfig.uploadError'))
    }
    setUploading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await apiPost('/api/settings', seo)
      if (res) {
        toast.success(t('seoConfig.saveSuccess'))
      } else {
        toast.error(t('seoConfig.saveError'))
      }
    } catch {
      toast.error(t('seoConfig.saveError'))
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{t('seoConfig.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('seoConfig.desc')}
        </p>
      </div>

      <Card className="rounded-2xl border-border/40 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">{t('seoConfig.webInfo')}</CardTitle>
          <CardDescription>{t('seoConfig.webInfoDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('seoConfig.systemName')}</Label>
            <Input
              name="seo_title"
              value={seo.seo_title}
              onChange={handleChange}
              placeholder="VD: OmniChat CRM - Multi Channel Chat System"
              className="rounded-xl bg-foreground/[0.02]"
            />
          </div>
          <div className="space-y-2">
            <Label>{t('seoConfig.description')}</Label>
            <Textarea
              name="seo_description"
              value={seo.seo_description}
              onChange={handleChange}
              placeholder="..."
              className="rounded-xl bg-foreground/[0.02] min-h-[80px]"
            />
          </div>
          <div className="space-y-2">
            <Label>{t('seoConfig.keywords')}</Label>
            <Input
              name="seo_keywords"
              value={seo.seo_keywords}
              onChange={handleChange}
              placeholder="crm, chat, omnichannel"
              className="rounded-xl bg-foreground/[0.02]"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/40 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">{t('seoConfig.logoInfo')}</CardTitle>
          <CardDescription>{t('seoConfig.logoDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-border/50 flex flex-col items-center justify-center overflow-hidden bg-foreground/[0.02] relative group">
              {seo.seo_logo ? (
                <>
                  <img src={seo.seo_logo} alt="Logo" className="w-24 h-24 object-contain" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-white font-medium">{t('seoConfig.changeImage')}</span>
                  </div>
                </>
              ) : (
                <UploadCloud className="h-6 w-6 text-muted-foreground/40 mb-1" />
              )}
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              {uploading && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
            </div>
            <div className="flex-1 pt-1 space-y-1">
              <Label>{t('seoConfig.currentPath')}</Label>
              <Input
                name="seo_logo"
                value={seo.seo_logo}
                onChange={handleChange}
                placeholder="/uploads/logo.png"
                className="rounded-xl bg-foreground/[0.02]"
              />
              <p className="text-[11px] text-muted-foreground/60 mt-1">{t('seoConfig.logoHint')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 rounded-xl h-10 px-6 font-semibold bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 shadow-md shadow-indigo-500/20"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t('seoConfig.saveBtn')}
        </Button>
      </div>
    </div>
  )
}
