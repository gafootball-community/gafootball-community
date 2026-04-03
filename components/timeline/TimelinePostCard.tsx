import { LikeButton } from '@/components/timeline/LikeButton';

type TimelineProfile = {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
};

type TimelinePost = {
  id: string;
  fixture_id: string;
  profile_id: string;
  content: string | null;
  image_url: string | null;
  reply_to_id: string | null;
  created_at: string;
  expires_at: string;
  is_hidden: boolean;
  is_deleted: boolean;
  profiles?: TimelineProfile | null;
  like_count?: number;
  liked_by_me?: boolean;
};

function formatPostTime(date: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

type Props = {
  post: TimelinePost;
  mine: boolean;
  reporting: boolean;
  liking: boolean;
  animateLike?: boolean;
  onProfileClick: (profileId: string) => void;
  onImageClick: (imageUrl: string) => void;
  onReport: (postId: string) => void;
  onDelete: (postId: string) => void;
  onLike: (post: TimelinePost) => void;
};

export function TimelinePostCard({
  post,
  mine,
  reporting,
  liking,
  animateLike = false,
  onProfileClick,
  onImageClick,
  onReport,
  onDelete,
  onLike,
}: Props) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(14,18,16,0.95),rgba(8,12,10,0.98))] p-4 shadow-[0_0_20px_rgba(16,185,129,0.04)]">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onProfileClick(post.profile_id)}
          className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          {post.profiles?.avatar_url ? (
            <img
              src={post.profiles.avatar_url}
              alt={post.profiles.nickname ?? 'avatar'}
              className="h-10 w-10 rounded-full border border-white/10 object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-panelSoft text-xs">
              👤
            </div>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onProfileClick(post.profile_id)}
              className="truncate text-left text-sm font-semibold text-white focus:outline-none focus-visible:underline"
            >
              {post.profiles?.nickname ?? '匿名ユーザー'}
            </button>

            <div className="shrink-0 text-[11px] text-textSub">
              <span>{formatPostTime(post.created_at)}</span>
            </div>
          </div>

          {post.content && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-textMain">
              {post.content}
            </p>
          )}

          {post.image_url && (
            <div className="mt-3 overflow-hidden rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => onImageClick(post.image_url!)}
                className="block w-full transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                <img
                  src={post.image_url}
                  alt="timeline post"
                  className="max-h-[360px] w-full object-cover"
                  loading="lazy"
                />
              </button>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3 text-xs text-textSub">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <LikeButton
                liked={!!post.liked_by_me}
                count={post.like_count ?? 0}
                disabled={liking}
                animate={animateLike}
                onClick={() => onLike(post)}
              />

              <button
                type="button"
                className="shrink-0 whitespace-nowrap rounded-full px-2 py-1.5 transition hover:bg-white/5 hover:text-textMain focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:px-2.5"
              >
                返信
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {!mine && (
                <button
                  type="button"
                  onClick={() => onReport(post.id)}
                  disabled={reporting}
                  className="whitespace-nowrap rounded-full px-2 py-1.5 text-[11px] text-yellow-300 transition hover:bg-white/5 hover:text-yellow-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300/40 disabled:cursor-not-allowed disabled:opacity-50 sm:px-2.5"
                >
                  {reporting ? '通報中...' : '通報'}
                </button>
              )}

              {mine && (
                <>
                  <span className="whitespace-nowrap text-[11px] text-accent">
                    あなたの投稿
                  </span>

                  <button
                    type="button"
                    onClick={() => onDelete(post.id)}
                    className="whitespace-nowrap rounded-full px-2 py-1.5 text-[11px] text-red-300 transition hover:bg-white/5 hover:text-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300/40 sm:px-2.5"
                  >
                    削除
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}