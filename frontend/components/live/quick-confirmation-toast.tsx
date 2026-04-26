export function QuickConfirmationToast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 rounded-2xl border border-emerald-400/25 bg-emerald-500/90 px-4 py-3 text-sm font-semibold text-[#04150d] shadow-2xl">
      {message}
    </div>
  );
}
