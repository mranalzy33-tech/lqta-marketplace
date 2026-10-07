import { MessageCircle, Send, Trash2, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import MarketplaceDashboardLayout from "@/components/MarketplaceDashboardLayout";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/marketplace/StatePanels";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { getNumberLocale } from "../../../shared/currency";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";

export default function Messages() {
  const { language, t } = useLocale();
  const { user } = useAuth();
  const numberLocale = getNumberLocale(language);
  const conversations = trpc.conversations.list.useQuery();
  const utils = trpc.useUtils();
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const recipientId = query.get("recipient");
  const listingId = query.get("listing");
  const details = trpc.conversations.messages.useQuery(
    { conversationId: selectedId ?? EMPTY_UUID },
    { enabled: Boolean(selectedId) },
  );
  const start = trpc.conversations.start.useMutation({
    onSuccess: result => {
      setSelectedId(result.id);
      toast.success(result.reused ? t("messages.currentConversationOpened") : t("messages.secureConversationCreated"));
      utils.conversations.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const send = trpc.conversations.send.useMutation({
    onSuccess: () => {
      setContent("");
      details.refetch();
      utils.conversations.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const removeMessage = trpc.conversations.delete.useMutation({
    onSuccess: () => { details.refetch(); utils.conversations.list.invalidate(); toast.success(language === "en" ? "Message deleted" : "تم حذف الرسالة"); },
    onError: error => toast.error(error.message),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedId && content.trim()) send.mutate({ conversationId: selectedId, content });
  };

  let panel: React.ReactNode;
  if (selectedId) {
    if (details.isLoading) {
      panel = <LoadingPanel label={t("messages.loadingMessages")} />;
    } else if (details.isError) {
      panel = <ErrorPanel onRetry={() => details.refetch()} />;
    } else {
      const conversation = details.data?.conversation;
      panel = (
        <div className="flex h-full min-h-[480px] flex-col">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf2f6] text-[#0b2343]"><UserRound className="h-5 w-5" /></span>
            <div>
              <p className="font-bold text-[#0b2343]">{t("messages.secureConversation")}</p>
              <p className="text-xs text-slate-500">{conversation?.status === "open" ? t("messages.statusOpen") : t("messages.statusClosed")}</p>
            </div>
          </div>
          <div className="flex-1 space-y-3 py-5">
            {details.data?.messages.length ? (
              details.data.messages.map(message => (
                <div key={message.id} className={`group relative max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.sender_id === user?.id ? "ms-auto bg-[#0b2343] text-white" : "bg-[#f4f7f9] text-slate-700"}`}>
                  <p>{message.content}</p>
                  <div className="mt-1 flex items-center justify-between gap-3"><p className={`text-[10px] ${message.sender_id === user?.id ? "text-slate-300" : "text-slate-600"}`}>{new Date(message.created_at).toLocaleString(numberLocale)}</p>{message.sender_id === user?.id ? <button type="button" aria-label={language === "en" ? "Delete message" : "حذف الرسالة"} onClick={() => removeMessage.mutate({ messageId: message.id })} disabled={removeMessage.isPending} className="opacity-60 transition hover:text-rose-300 hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button> : null}</div>
                </div>
              ))
            ) : (
              <p className="py-16 text-center text-sm text-slate-500">{t("messages.noMessagesYet")}</p>
            )}
          </div>
          {conversation?.status === "open" ? (
            <form onSubmit={submit} className="flex gap-2 border-t border-slate-100 pt-4">
              <input value={content} onChange={event => setContent(event.target.value)} maxLength={2000} placeholder={t("messages.writeYourMessage")} className="h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#b87f1c]" />
              <Button disabled={send.isPending || !content.trim()} className="h-11 bg-[#0b2343] hover:bg-[#163961]"><Send className="h-4 w-4" /></Button>
            </form>
          ) : (
            <p className="border-t border-slate-100 pt-4 text-center text-sm text-slate-500">{t("messages.conversationClosed")}</p>
          )}
        </div>
      );
    }
  } else if (recipientId && listingId) {
    panel = (
      <div className="grid h-full min-h-[480px] place-items-center text-center">
        <div className="max-w-sm">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f8e6b4] text-[#aa741b]"><MessageCircle className="h-7 w-7" /></span>
          <h2 className="mt-5 text-xl font-black text-[#0b2343]">{t("messages.startWithSellerTitle")}</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">{t("messages.startWithSellerDescription")}</p>
          <Button onClick={() => start.mutate({ recipientId, listingId })} disabled={start.isPending} className="mt-6 bg-[#0b2343] hover:bg-[#163961]">
            {start.isPending ? t("messages.creatingConversation") : t("messages.startConversation")}
          </Button>
        </div>
      </div>
    );
  } else {
    panel = <EmptyPanel title={t("messages.selectConversation")} description={t("messages.selectConversationDescription")} />;
  }

  return (
    <MarketplaceDashboardLayout eyebrow={t("messages.eyebrow")} title={t("messages.title")}>
      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-[#0b2343]">{t("messages.conversations")}</h2>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#f8e6b4] text-[#aa741b]"><MessageCircle className="h-4 w-4" /></span>
          </div>
          {conversations.isLoading ? (
            <div className="mt-4"><LoadingPanel label={t("messages.loading")} /></div>
          ) : conversations.isError ? (
            <div className="mt-4"><ErrorPanel onRetry={() => conversations.refetch()} /></div>
          ) : conversations.data?.length ? (
            <div className="mt-4 space-y-2">
              {conversations.data.map(conversation => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedId(conversation.id)}
                  className={`w-full rounded-xl p-3 text-start transition ${selectedId === conversation.id ? "bg-[#0b2343] text-white" : "bg-[#f7f9fb] text-[#0b2343] hover:bg-[#eef3f7]"}`}
                >
                  <p className="text-sm font-bold">{conversation.otherParticipant?.name ?? t("messages.defaultConversationName")}</p>
                  <p className={`mt-1 line-clamp-1 text-xs ${selectedId === conversation.id ? "text-slate-300" : "text-slate-500"}`}>{conversation.lastMessage?.content ?? t("messages.noMessagesPreview")}</p>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-500">{t("messages.noConversationsYet")}</p>
          )}
        </section>
        <section className="min-h-[520px] rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">{panel}</section>
      </div>
    </MarketplaceDashboardLayout>
  );
}
