import { useRef, useState } from "react";
import { CalendarClock, Check, ExternalLink, ImagePlus, Megaphone, Pencil, Power, X } from "lucide-react";
import AdminAccessGate from "@/components/AdminAccessGate";
import MarketplaceDashboardLayout from "@/components/MarketplaceDashboardLayout";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/marketplace/StatePanels";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Campaign = {
  id: string;
  companyName: string;
  title: string;
  description: string;
  imageUrl: string;
  targetUrl: string;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  companyName: string;
  title: string;
  description: string;
  targetUrl: string;
  startsAt: string;
  endsAt: string;
  sortOrder: string;
  isActive: boolean;
};
const blankForm: FormState = { companyName: "", title: "", description: "", targetUrl: "", startsAt: "", endsAt: "", sortOrder: "0", isActive: false };
function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function isoDateTime(value: string) { return value ? new Date(value).toISOString() : null; }

export default function AdminCampaigns() {
  const { language, t } = useLocale();
  const { user } = useAuth();
  const en = language === "en";
  const canManage = user?.role === "super_admin" || Boolean(user?.adminPermissions?.includes("admin.ads.manage"));
  const s = en ? {
    eyebrow: "PARTNERS & BRANDS", title: "Sponsored campaigns", intro: "Manage company and institution ads shown on the marketplace. Campaigns are retained; turn them off instead of deleting them.",
    newCampaign: "Create campaign", editCampaign: "Edit campaign", company: "Company or institution", adTitle: "Headline", description: "Short description", image: "Campaign image", target: "Destination URL", start: "Starts at (optional)", end: "Ends at (optional)", order: "Display order", active: "Visible on home page", inactive: "Paused", save: "Save campaign", cancel: "Cancel", chooseImage: "Choose image", imageHelp: "JPEG, PNG or WebP, up to 5 MB.", removeImage: "Remove image", listTitle: "Campaigns", loading: "Loading campaigns", empty: "No campaigns yet", emptyText: "Create a campaign to feature a company or institution on the home page.", statusLive: "Active", statusOff: "Paused", scheduled: "Scheduled", opens: "Opens", closes: "Closes", edit: "Edit", enable: "Activate", pause: "Pause", click: "Open destination", saveSuccess: "Campaign saved", updated: "Campaign updated", invalidImage: "Choose JPEG, PNG, or WebP up to 5 MB", badImage: "Could not read this image", uploadFailure: "Image upload failed", upload: "Uploading image…", noImage: "Add an image before saving", network: "Campaigns could not be loaded", migrationRequired: "The campaigns table is missing in the connected Supabase database. Apply supabase/migrations/20260925_add_sponsored_campaigns.sql, then retry.", httpOnly: "Use a valid http:// or https:// destination URL", removeConfirm: "Clear the image",
  } : {
    eyebrow: "الشركاء والعلامات التجارية", title: "الإعلانات المؤسسية", intro: "إدارة إعلانات الشركات والمؤسسات التي تظهر في السوق. تُحفظ الحملات؛ أوقف عرضها بدل حذفها.",
    newCampaign: "إنشاء حملة", editCampaign: "تعديل الحملة", company: "الشركة أو المؤسسة", adTitle: "عنوان الإعلان", description: "وصف مختصر", image: "صورة الإعلان", target: "رابط الوجهة", start: "تاريخ البداية (اختياري)", end: "تاريخ الانتهاء (اختياري)", order: "ترتيب العرض", active: "إظهار في الصفحة الرئيسية", inactive: "متوقفة", save: "حفظ الحملة", cancel: "إلغاء", chooseImage: "اختر صورة", imageHelp: "JPEG أو PNG أو WebP، حتى 5 ميغابايت.", removeImage: "إزالة الصورة", listTitle: "الحملات", loading: "جارٍ تحميل الحملات", empty: "لا توجد حملات بعد", emptyText: "أنشئ حملة لعرض إحدى الشركات أو المؤسسات في الصفحة الرئيسية.", statusLive: "مفعّلة", statusOff: "متوقفة", scheduled: "مجدولة", opens: "تبدأ", closes: "تنتهي", edit: "تعديل", enable: "تفعيل", pause: "إيقاف", click: "فتح الوجهة", saveSuccess: "تم حفظ الحملة", updated: "تم تحديث الحملة", invalidImage: "اختر صورة JPEG أو PNG أو WebP لا يتجاوز حجمها 5 ميغابايت", badImage: "تعذرت قراءة الصورة", uploadFailure: "تعذر رفع الصورة", upload: "جارٍ رفع الصورة…", noImage: "أضف صورة قبل الحفظ", network: "تعذر تحميل الحملات", migrationRequired: "جدول الحملات غير موجود في قاعدة Supabase المتصلة. طبّق الملف supabase/migrations/20260925_add_sponsored_campaigns.sql ثم أعد المحاولة.", httpOnly: "استخدم رابط وجهة صالحًا يبدأ بـ http:// أو https://", removeConfirm: "إزالة الصورة",
  };
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState<FormState>(blankForm);
  const [imageUrl, setImageUrl] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const companyInputRef = useRef<HTMLInputElement>(null);
  const campaigns = trpc.admin.sponsoredAds.useQuery();
  const utils = trpc.useUtils();
  const upload = trpc.admin.uploadSponsoredAdImage.useMutation({ onError: error => toast.error(error.message) });
  const create = trpc.admin.createSponsoredAd.useMutation({ onSuccess: () => { toast.success(s.saveSuccess); reset(); void utils.admin.sponsoredAds.invalidate(); void utils.marketplace.sponsoredAds.invalidate(); }, onError: error => toast.error(error.message) });
  const update = trpc.admin.updateSponsoredAd.useMutation({ onSuccess: () => { toast.success(s.updated); reset(); void utils.admin.sponsoredAds.invalidate(); void utils.marketplace.sponsoredAds.invalidate(); }, onError: error => toast.error(error.message) });
  const busy = upload.isPending || create.isPending || update.isPending;
  const reset = () => { setEditing(null); setForm(blankForm); setImageUrl(""); setImageDataUrl(""); };
  const beginEdit = (campaign: Campaign) => {
    setEditing(campaign);
    setImageUrl(campaign.imageUrl);
    setImageDataUrl("");
    setForm({ companyName: campaign.companyName, title: campaign.title, description: campaign.description, targetUrl: campaign.targetUrl, startsAt: localDateTime(campaign.startsAt), endsAt: localDateTime(campaign.endsAt), sortOrder: String(campaign.sortOrder), isActive: campaign.isActive });
  };
  const selectImage = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { toast.error(s.invalidImage); return; }
    const reader = new FileReader();
    reader.onload = () => { setImageDataUrl(String(reader.result)); setImageUrl(""); };
    reader.onerror = () => toast.error(s.badImage);
    reader.readAsDataURL(file);
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^https?:\/\//i.test(form.targetUrl)) { toast.error(s.httpOnly); return; }
    let resolvedImage = imageUrl;
    if (imageDataUrl) {
      try { resolvedImage = (await upload.mutateAsync({ dataUrl: imageDataUrl })).url; }
      catch { toast.error(s.uploadFailure); return; }
    }
    if (!resolvedImage) { toast.error(s.noImage); return; }
    const payload = {
      companyName: form.companyName, title: form.title, description: form.description, imageUrl: resolvedImage, targetUrl: form.targetUrl,
      startsAt: isoDateTime(form.startsAt), endsAt: isoDateTime(form.endsAt), sortOrder: Number(form.sortOrder || 0), isActive: form.isActive,
    };
    if (editing) update.mutate({ id: editing.id, ...payload });
    else create.mutate(payload);
  };
  const updateCampaign = (campaign: Campaign, isActive: boolean) => update.mutate({
    id: campaign.id, companyName: campaign.companyName, title: campaign.title, description: campaign.description, imageUrl: campaign.imageUrl,
    targetUrl: campaign.targetUrl, startsAt: campaign.startsAt, endsAt: campaign.endsAt, sortOrder: campaign.sortOrder, isActive,
  });
  const dateText = (value: string | null) => value ? new Date(value).toLocaleString(en ? "en-US" : "ar-SA", { dateStyle: "medium", timeStyle: "short" }) : (en ? "Any time" : "مفتوح");

  return <MarketplaceDashboardLayout eyebrow={t("adminCampaigns.eyebrow")} title={t("adminCampaigns.title")}>
    <AdminAccessGate permission="admin.ads.read">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#17385e] via-[#0b2343] to-[#071a32] p-5 text-white shadow-[0_20px_48px_-35px_rgba(8,30,58,.8)] sm:p-7">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-[#f7d67f]"><Megaphone className="h-4 w-4" />{s.eyebrow}</span>
        <h2 className="mt-3 text-xl font-black sm:text-2xl">{s.title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">{s.intro}</p>
      </div>
      <div className={`mt-6 grid min-w-0 gap-5 ${canManage ? "xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,.9fr)]" : "grid-cols-1"}`}>
        {canManage ? <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4"><h3 className="font-black text-[#0b2343]">{editing ? s.editCampaign : s.newCampaign}</h3>{editing ? <button type="button" onClick={reset} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label={s.cancel}><X className="h-4 w-4" /></button> : null}</div>
          <form onSubmit={submit} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="min-w-0 text-sm font-bold text-[#0b2343]">{s.company}<input ref={companyInputRef} required maxLength={120} value={form.companyName} onChange={e => setForm(current => ({ ...current, companyName: e.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal dark:bg-slate-900" /></label>
              <label className="min-w-0 text-sm font-bold text-[#0b2343]">{s.adTitle}<input required maxLength={160} value={form.title} onChange={e => setForm(current => ({ ...current, title: e.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal dark:bg-slate-900" /></label>
            </div>
            <label className="block text-sm font-bold text-[#0b2343]">{s.description}<textarea required maxLength={1000} value={form.description} onChange={e => setForm(current => ({ ...current, description: e.target.value }))} className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal leading-6 dark:bg-slate-900" /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="min-w-0 text-sm font-bold text-[#0b2343]">{s.target}<input required type="url" maxLength={2000} dir="ltr" value={form.targetUrl} onChange={e => setForm(current => ({ ...current, targetUrl: e.target.value }))} placeholder="https://example.com" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal dark:bg-slate-900" /></label>
              <label className="min-w-0 text-sm font-bold text-[#0b2343]">{s.order}<input type="number" min={0} max={10000} step={1} value={form.sortOrder} onChange={e => setForm(current => ({ ...current, sortOrder: e.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal dark:bg-slate-900" /></label>
              <label className="min-w-0 text-sm font-bold text-[#0b2343]">{s.start}<input type="datetime-local" value={form.startsAt} onChange={e => setForm(current => ({ ...current, startsAt: e.target.value }))} className="mt-2 h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal dark:bg-slate-900" /></label>
              <label className="min-w-0 text-sm font-bold text-[#0b2343]">{s.end}<input type="datetime-local" value={form.endsAt} onChange={e => setForm(current => ({ ...current, endsAt: e.target.value }))} className="mt-2 h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal dark:bg-slate-900" /></label>
            </div>
            <div className="rounded-2xl border border-dashed border-[#d7b15e] bg-[#fffdf7] p-3 sm:p-4">
              <p className="text-sm font-bold text-[#0b2343]">{s.image}</p>
              <div className="mt-3 flex min-w-0 items-center gap-3">
                <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">{imageDataUrl || imageUrl ? <img src={imageDataUrl || imageUrl} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full w-full place-items-center text-slate-400"><ImagePlus className="h-5 w-5" /></span>}</div>
                <div className="min-w-0 flex-1"><label className="inline-flex max-w-full cursor-pointer items-center gap-2 rounded-lg bg-[#0b2343] px-3 py-2 text-xs font-bold text-white hover:bg-[#163961]"><ImagePlus className="h-4 w-4" />{s.chooseImage}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { selectImage(e.target.files?.[0]); e.currentTarget.value = ""; }} className="sr-only" /></label><p className="mt-2 text-[11px] font-normal text-slate-500">{s.imageHelp}</p></div>
                {imageDataUrl || imageUrl ? <button type="button" onClick={() => { setImageDataUrl(""); setImageUrl(""); }} aria-label={s.removeImage} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-rose-50 hover:text-rose-600"><X className="h-4 w-4" /></button> : null}
              </div>
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-[#0b2343]"><input type="checkbox" checked={form.isActive} onChange={e => setForm(current => ({ ...current, isActive: e.target.checked }))} className="h-4 w-4 accent-[#0b2343]" />{form.isActive ? s.active : s.inactive}</label>
            <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy} className="bg-[#0b2343] hover:bg-[#163961]"><Check className="me-2 h-4 w-4" />{upload.isPending ? s.upload : s.save}</Button>{editing ? <Button type="button" variant="outline" disabled={busy} onClick={reset}>{s.cancel}</Button> : null}</div>
          </form>
        </section> : null}
        <section className="min-w-0">
          <h3 className="mb-4 font-black text-[#0b2343]">{s.listTitle}</h3>
          {campaigns.isLoading ? <LoadingPanel label={s.loading} /> : campaigns.isError ? <div><ErrorPanel onRetry={() => campaigns.refetch()} />{campaigns.error.data?.code === "PRECONDITION_FAILED" ? <p role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium leading-6 text-amber-900">{s.migrationRequired}</p> : null}</div> : campaigns.data?.length ? <div className="space-y-3">{campaigns.data.map(campaign => <article key={campaign.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:bg-card">
            <div className="flex min-w-0 gap-3 p-3 sm:p-4"><img src={campaign.imageUrl} alt="" className="h-24 w-28 shrink-0 rounded-xl bg-slate-100 object-cover" loading="lazy" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[11px] font-bold text-[#a7771b]">{campaign.companyName}</p><h4 className="mt-1 line-clamp-2 text-sm font-black text-[#0b2343] dark:text-foreground">{campaign.title}</h4></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${campaign.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{campaign.isActive ? s.statusLive : s.statusOff}</span></div><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{campaign.description}</p></div></div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-3 py-2.5 sm:px-4"><div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500"><span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />{s.opens}: {dateText(campaign.startsAt)}</span><span>{s.closes}: {dateText(campaign.endsAt)}</span><a className="inline-flex max-w-[180px] items-center gap-1 truncate text-[#0b2343] hover:underline" href={campaign.targetUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 shrink-0" />{s.click}</a></div>{canManage ? <div className="flex shrink-0 gap-1"><button type="button" onClick={() => beginEdit(campaign)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-white hover:text-[#0b2343]" aria-label={s.edit}><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => updateCampaign(campaign, !campaign.isActive)} disabled={update.isPending} className={`grid h-8 w-8 place-items-center rounded-lg hover:bg-white ${campaign.isActive ? "text-amber-700" : "text-emerald-700"}`} aria-label={campaign.isActive ? s.pause : s.enable}><Power className="h-4 w-4" /></button></div> : null}</div>
          </article>)}</div> : <EmptyPanel title={s.empty} description={s.emptyText} action={canManage ? { label: s.newCampaign, onClick: () => companyInputRef.current?.focus() } : undefined} />}
        </section>
      </div>
    </AdminAccessGate>
  </MarketplaceDashboardLayout>;
}
