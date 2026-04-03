type Props = {
  liked: boolean;
  count: number;
  disabled?: boolean;
  animate?: boolean; // ← 追加
  onClick: () => void;
};

export function LikeButton({
  liked,
  count,
  disabled = false,
  animate = false,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={liked ? 'いいねを取り消す' : 'いいねする'}
      aria-pressed={liked}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-50 ${
        liked
          ? 'bg-accent/10 text-accent'
          : 'text-textSub hover:bg-white/5 hover:text-textMain'
      }`}
    >
      {/* ⚽ボール */}
      <span
        className={`text-sm leading-none transition ${
          liked ? 'scale-110' : ''
        } ${animate ? 'animate-like-ball-bounce' : ''}`}
        aria-hidden="true"
      >
        ⚽
      </span>

      {/* 数字 */}
      <span
        className={`text-[12px] font-semibold leading-none ${
          animate ? 'animate-like-count-pop' : ''
        }`}
      >
        {count}
      </span>
    </button>
  );
}