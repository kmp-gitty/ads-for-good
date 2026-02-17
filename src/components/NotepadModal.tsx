"use client";

type NotepadModalProps = {
  open: boolean;
  onClose: () => void;
  docUrl: string;
  title?: string;
};

export default function NotepadModal({
  open,
  onClose,
  docUrl,
  title = "Notepad",
}: NotepadModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="relative w-full max-w-5xl h-[80vh] rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-sm text-neutral-500 hover:text-neutral-800"
          >
            ✕
          </button>
        </div>

        {/* Google Doc */}
        <iframe
          src={docUrl}
          className="h-full w-full rounded-b-xl"
          allow="clipboard-write"
        />
      </div>
    </div>
  );
}
