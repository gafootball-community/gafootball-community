import { FormEvent, RefObject } from 'react';

type TimelineProfile = {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
};

function ImageAddIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="5" width="17" height="14" rx="3" />
      <circle cx="9" cy="10" r="1.4" fill="currentColor" stroke="none" />
      <path d="M20.5 15l-4.5-4.5-5.5 5.5" />
      <path d="M13 13.5l1.5-1.5 3 3" />
      <path d="M12 3v4" />
      <path d="M10 5h4" />
    </svg>
  );
}

type Props = {
  value: string;
  sending: boolean;
  previewUrl: string | null;
  selectedImage: File | null;
  myProfile: TimelineProfile | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onSubmit: (e: FormEvent) => void;
  onChangeValue: (value: string) => void;
  onPickImage: () => void;
  onChangeImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
};

export function TimelineComposer({
  value,
  sending,
  previewUrl,
  selectedImage,
  myProfile,
  fileInputRef,
  onSubmit,
  onChangeValue,
  onPickImage,
  onChangeImage,
  onClearImage,
}: Props) {
  return (
    <form
      onSubmit={onSubmit}
      className="fixed inset-x-0 bottom-[calc(4.13rem+env(safe-area-inset-bottom))] z-30 border-t border-white/10 bg-[rgba(5,10,8,0.94)] px-3 py-2 backdrop-blur"
    >
      <div className="mx-auto max-w-2xl px-2">
        {previewUrl && (
          <div className="mb-3 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(14,18,16,0.95),rgba(8,12,10,0.98))] p-4 shadow-[0_0_20px_rgba(16,185,129,0.04)]">
            <div className="flex items-start gap-3">
              {myProfile?.avatar_url ? (
                <img
                  src={myProfile.avatar_url}
                  alt={myProfile.nickname ?? 'avatar'}
                  className="h-10 w-10 rounded-full border border-white/10 object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-panelSoft text-xs">
                  👤
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-left text-sm font-semibold text-white">
                    {myProfile?.nickname ?? 'あなた'}
                  </p>

                  <button
                    type="button"
                    onClick={onClearImage}
                    className="rounded-full bg-black/60 px-2 py-1 text-[11px] text-white transition hover:bg-black/80"
                  >
                    ×
                  </button>
                </div>

                {value.trim() && (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-textMain">
                    {value}
                  </p>
                )}

                <div className="mt-3 overflow-hidden rounded-2xl border border-white/10">
                  <button
                    type="button"
                    onClick={onPickImage}
                    className="block w-full"
                  >
                    <img
                      src={previewUrl}
                      alt="preview"
                      className="max-h-[360px] w-full object-cover"
                    />
                  </button>
                </div>

                <div className="mt-2 text-[11px] text-textSub">
                  画像をタップで差し替え
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPickImage}
            className="group flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-panelSoft text-white shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition hover:border-accent/30 hover:bg-white/10"
            aria-label="画像を選択"
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="selected"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-[linear-gradient(180deg,rgba(20,28,24,0.95),rgba(12,18,15,0.98))] text-textSub transition group-hover:text-white">
                <ImageAddIcon />
              </div>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onChangeImage}
          />

          <input
            value={value}
            onChange={(e) => onChangeValue(e.target.value)}
            placeholder="この試合について投稿する"
            className="h-10 flex-1 rounded-full border border-white/10 bg-panelSoft px-4 text-base text-textMain placeholder:text-textSub focus:border-accent focus:outline-none"
            maxLength={280}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />

          <button
            type="submit"
            disabled={sending || (!value.trim() && !selectedImage)}
            className="h-10 rounded-full bg-accent px-4 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? '送信中' : '投稿'}
          </button>
        </div>
      </div>
    </form>
  );
}