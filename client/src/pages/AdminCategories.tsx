import { useState } from "react";
import { Check, FolderTree, ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import AdminAccessGate from "@/components/AdminAccessGate";
import MarketplaceDashboardLayout from "@/components/MarketplaceDashboardLayout";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/marketplace/StatePanels";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Subcategory = { id: string; category_id: string; name: string; name_en?: string | null; slug: string };
type Category = { id: string; name: string; name_en?: string | null; slug: string; icon: string | null; imageUrl?: string | null; subcategories: Subcategory[] };

function AdminCategoriesContent() {
  const { language, t } = useLocale();
  const categories = trpc.admin.categories.useQuery();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const [icon, setIcon] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [subParentId, setSubParentId] = useState("");
  const [subEditing, setSubEditing] = useState<Subcategory | null>(null);
  const [subName, setSubName] = useState("");
  const [subNameEn, setSubNameEn] = useState("");
  const [subSlug, setSubSlug] = useState("");
  const clear = () => { setEditing(null); setName(""); setNameEn(""); setSlug(""); setIcon(""); setImageUrl(""); setImageDataUrl(""); };
  const uploadCategoryImage = trpc.admin.uploadCategoryImage.useMutation({ onError: error => toast.error(error.message) });
  const create = trpc.admin.createCategory.useMutation({
    onSuccess: () => { toast.success(t("adminCategories.categoryAdded")); clear(); utils.admin.categories.invalidate(); utils.marketplace.categories.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const update = trpc.admin.updateCategory.useMutation({
    onSuccess: () => { toast.success(t("adminCategories.categoryUpdated")); clear(); utils.admin.categories.invalidate(); utils.marketplace.categories.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const clearSub = () => { setSubEditing(null); setSubName(""); setSubNameEn(""); setSubSlug(""); };
  const createSub = trpc.admin.createSubcategory.useMutation({ onSuccess: () => { toast.success(language === "en" ? "Subcategory added" : "تمت إضافة الفئة الفرعية"); clearSub(); utils.admin.categories.invalidate(); utils.marketplace.categories.invalidate(); }, onError: error => toast.error(error.message) });
  const updateSub = trpc.admin.updateSubcategory.useMutation({ onSuccess: () => { toast.success(language === "en" ? "Subcategory updated" : "تم تحديث الفئة الفرعية"); clearSub(); utils.admin.categories.invalidate(); utils.marketplace.categories.invalidate(); }, onError: error => toast.error(error.message) });
  const deleteCategory = trpc.admin.deleteCategory.useMutation({ onSuccess: () => { toast.success(language === "en" ? "Category deleted" : "تم حذف التصنيف"); utils.admin.categories.invalidate(); utils.marketplace.categories.invalidate(); }, onError: error => toast.error(error.message) });
  const deleteSubcategory = trpc.admin.deleteSubcategory.useMutation({ onSuccess: () => { toast.success(language === "en" ? "Subcategory deleted" : "تم حذف الفئة الفرعية"); utils.admin.categories.invalidate(); utils.marketplace.categories.invalidate(); }, onError: error => toast.error(error.message) });
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    let nextImageUrl = imageUrl;
    if (imageDataUrl) {
      try {
        const uploaded = await uploadCategoryImage.mutateAsync({ dataUrl: imageDataUrl });
        nextImageUrl = uploaded.url;
      } catch {
        return;
      }
    }
    const payload = { name: name.trim(), nameEn: nameEn.trim() || undefined, slug: slug.trim(), icon: icon.trim() || undefined, imageUrl: nextImageUrl || null };
    if (editing) update.mutate({ categoryId: editing.id, ...payload });
    else create.mutate(payload);
  };
  const startEdit = (category: Category) => { setEditing(category); setName(category.name); setNameEn(category.name_en ?? ""); setSlug(category.slug); setImageUrl(category.imageUrl ?? ""); setImageDataUrl(""); setIcon(category.imageUrl ? "" : category.icon ?? ""); };
  const selectCategoryImage = (file: File | undefined) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast.error(language === "en" ? "Choose a JPEG, PNG, or WebP image up to 5 MB" : "اختر صورة JPEG أو PNG أو WebP لا يتجاوز حجمها 5 ميغابايت");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { setImageDataUrl(String(reader.result)); setImageUrl(""); setIcon(""); };
    reader.onerror = () => toast.error(language === "en" ? "Could not read the selected image" : "تعذرت قراءة الصورة المحددة");
    reader.readAsDataURL(file);
  };
  const startSubEdit = (categoryId: string, subcategory: Subcategory) => { setSubParentId(categoryId); setSubEditing(subcategory); setSubName(subcategory.name); setSubNameEn(subcategory.name_en ?? ""); setSubSlug(subcategory.slug); };
  const submitSub = (event: React.FormEvent) => { event.preventDefault(); const payload = { name: subName.trim(), nameEn: subNameEn.trim() || undefined, slug: subSlug.trim().toLowerCase() }; if (subEditing) updateSub.mutate({ subcategoryId: subEditing.id, ...payload }); else if (subParentId) createSub.mutate({ categoryId: subParentId, ...payload }); };

  return (
    <>
      <section className="rounded-[1.5rem] bg-[#0b2343] p-6 text-white">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f7d67f] text-[#0b2343]"><FolderTree className="h-5 w-5" /></span>
          <div>
            <h2 className="font-black">{t("adminCategories.heroTitle")}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-300">{t("adminCategories.heroDescription")}</p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <form onSubmit={submit} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-[#0b2343]">{editing ? t("adminCategories.editTitle") : t("adminCategories.addTitle")}</h3>
            {editing ? <button type="button" onClick={clear} className="text-xs font-bold text-rose-600">{t("adminCategories.cancel")}</button> : null}
          </div>
          <label className="mt-5 block text-sm font-bold text-[#0b2343]">
            {t("adminCategories.nameArLabel")}
            <input required value={name} onChange={event => setName(event.target.value)} maxLength={80} placeholder={t("adminCategories.nameArPlaceholder")} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal" />
          </label>
          <label className="mt-4 block text-sm font-bold text-[#0b2343]">
            {t("adminCategories.nameEnLabel")}
            <input value={nameEn} onChange={event => setNameEn(event.target.value)} maxLength={80} placeholder={t("adminCategories.nameEnPlaceholder")} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal" />
          </label>
          <label className="mt-4 block text-sm font-bold text-[#0b2343]">
            {t("adminCategories.slugLabel")}
            <input required value={slug} onChange={event => setSlug(event.target.value.toLowerCase())} pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} placeholder={t("adminCategories.slugPlaceholder")} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal" />
            <span className="mt-1 block text-xs font-normal text-slate-500">{t("adminCategories.slugHelp")}</span>
          </label>
          <div className="mt-4 text-sm font-bold text-[#0b2343]">
            <p>{t("adminCategories.iconLabel")}</p>
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-dashed border-[#d7b15e] bg-[#fffdf7] p-3">
              <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#f3f6f8] text-[#b17a1c] ring-1 ring-slate-200">
                {imageDataUrl || imageUrl ? <img src={imageDataUrl || imageUrl} alt="" className="h-full w-full object-cover" /> : icon ? <span className="text-2xl" aria-hidden="true">{icon}</span> : <ImagePlus className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { selectCategoryImage(event.target.files?.[0]); event.currentTarget.value = ""; }} className="block w-full min-w-0 text-xs font-normal file:me-2 file:rounded-lg file:border-0 file:bg-[#0b2343] file:px-3 file:py-2 file:font-bold file:text-white" />
                <p className="mt-1 text-[11px] font-normal text-slate-500">{t("adminCategories.imageHelp")}</p>
              </div>
              {imageDataUrl || imageUrl ? <button type="button" onClick={() => { setImageDataUrl(""); setImageUrl(""); }} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-rose-50 hover:text-rose-600" aria-label={t("adminCategories.removeImage")}><X className="h-4 w-4" /></button> : null}
            </div>
          </div>
          <Button disabled={create.isPending || update.isPending || uploadCategoryImage.isPending} className="mt-5 w-full bg-[#0b2343] hover:bg-[#163961]">
            {editing ? <><Check className="ml-1 h-4 w-4" /> {t("adminCategories.saveEdit")}</> : <><Plus className="ml-1 h-4 w-4" /> {t("adminCategories.addCategory")}</>}
          </Button>
        </form>

        <div>
          <form onSubmit={submitSub} className="mb-4 rounded-2xl border border-[#ecd79e] bg-[#fffdf7] p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3"><h3 className="font-bold text-[#0b2343]">{subEditing ? (language === "en" ? "Edit subcategory" : "تعديل فئة فرعية") : (language === "en" ? "Add subcategory" : "إضافة فئة فرعية")}</h3>{subEditing ? <button type="button" onClick={clearSub} className="text-xs font-bold text-rose-600">{t("adminCategories.cancel")}</button> : null}</div>
            <div className="mt-3 grid gap-2 md:grid-cols-4">
              <select disabled={Boolean(subEditing)} required value={subParentId} onChange={event => setSubParentId(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">{language === "en" ? "Parent category" : "التصنيف الرئيسي"}</option>{categories.data?.map(category => <option key={category.id} value={category.id}>{language === "en" ? category.name_en || category.name : category.name}</option>)}</select>
              <input required value={subName} onChange={event => setSubName(event.target.value)} maxLength={80} placeholder={language === "en" ? "Arabic name" : "الاسم بالعربية"} className="h-10 rounded-xl border border-slate-200 px-3 text-sm" />
              <input value={subNameEn} onChange={event => setSubNameEn(event.target.value)} maxLength={80} placeholder={language === "en" ? "English name" : "الاسم بالإنجليزية"} className="h-10 rounded-xl border border-slate-200 px-3 text-sm" />
              <div className="flex gap-2"><input required value={subSlug} onChange={event => setSubSlug(event.target.value.toLowerCase())} pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} placeholder="slug" className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm" /><Button disabled={createSub.isPending || updateSub.isPending} className="bg-[#0b2343]">{subEditing ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</Button></div>
            </div>
          </form>
          {categories.isLoading ? (
            <LoadingPanel label={t("adminCategories.loading")} />
          ) : categories.isError ? (
            <ErrorPanel onRetry={() => categories.refetch()} />
          ) : categories.data?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {categories.data.map(category => (
                <article key={category.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#f3f6f8] text-[#b17a1c] ring-1 ring-slate-200">{category.imageUrl ? <img src={category.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : category.icon ? <span className="text-2xl" aria-hidden="true">{category.icon}</span> : <ImagePlus className="h-5 w-5" />}</span>
                    <div className="min-w-0"><p className="truncate font-bold text-[#0b2343]">{category.name}</p>
                    <p className="mt-1 text-sm text-slate-600" dir="ltr">{category.name_en || t("adminCategories.noEnglishName")}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">/{category.slug}</p>
                    {category.subcategories?.length ? <div className="mt-3 flex flex-wrap gap-1.5">{category.subcategories.map(subcategory => <span key={subcategory.id} className="inline-flex items-center gap-1 rounded-full bg-[#f6eed8] px-2 py-1 text-xs text-[#7b5a16]"><button type="button" onClick={() => startSubEdit(category.id, subcategory)}>{subcategory.name} <span className="opacity-60">· {subcategory.slug}</span></button><button type="button" aria-label="Delete subcategory" onClick={() => deleteSubcategory.mutate({ subcategoryId: subcategory.id })} disabled={deleteSubcategory.isPending}><Trash2 className="h-3 w-3" /></button></span>)}</div> : null}</div>
                  </div>
                  <div className="flex shrink-0 gap-2"><Button size="sm" variant="outline" onClick={() => startEdit(category)} className="border-[#d7b15e] text-[#0b2343]"><Pencil className="ml-1 h-3.5 w-3.5" /> {t("adminCategories.edit")}</Button><Button size="sm" variant="outline" onClick={() => deleteCategory.mutate({ categoryId: category.id })} disabled={deleteCategory.isPending} className="border-rose-200 text-rose-700"><Trash2 className="h-3.5 w-3.5" /></Button></div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyPanel title={t("adminCategories.emptyTitle")} description={t("adminCategories.emptyDescription")} />
          )}
        </div>
      </section>
    </>
  );
}

export default function AdminCategories() {
  const { t } = useLocale();
  return (
    <MarketplaceDashboardLayout eyebrow={t("adminCategories.eyebrow")} title={t("adminCategories.title")}>
      <AdminAccessGate permission="admin.categories.read">
        <AdminCategoriesContent />
      </AdminAccessGate>
    </MarketplaceDashboardLayout>
  );
}
