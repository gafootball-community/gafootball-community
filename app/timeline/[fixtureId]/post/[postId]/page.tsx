'use client';

import Link from 'next/link';
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { currentUserId } from '@/lib/auth';
import { TimelineComposer } from '@/components/timeline/TimelineComposer';
import { TimelinePostCard } from '@/components/timeline/TimelinePostCard';

type Fixture = {
  id: string;
  league_key: string;
  league_name: string;
  home_team: string;
  away_team: string;
  home_team_short: string | null;
  away_team_short: string | null;
  kickoff_at: string;
  expires_at: string | null;
  status: 'upcoming' | 'live' | 'finished';
  home_score: number;
  away_score: number;
};

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

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function createStoragePath(profileId: string, file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const safeExt = extension === 'jpeg' ? 'jpg' : extension;
  const unique = `${Date.now()}-${crypto.randomUUID()}`;
  return `${profileId}/${unique}.${safeExt}`;
}

async function attachLikesToPosts(
  posts: TimelinePost[],
  myId: string | null
): Promise<TimelinePost[]> {
  if (posts.length === 0) return [];

  const postIds = posts.map((post) => post.id);

  const { data: likeRows, error: likeError } = await supabase
    .from('timeline_likes')
    .select('post_id')
    .in('post_id', postIds);

  if (likeError) throw likeError;

  const countMap = new Map<string, number>();
  for (const row of likeRows ?? []) {
    const postId = (row as { post_id: string }).post_id;
    countMap.set(postId, (countMap.get(postId) ?? 0) + 1);
  }

  const likedSet = new Set<string>();

  if (myId) {
    const { data: myLikes, error: myLikesError } = await supabase
      .from('timeline_likes')
      .select('post_id')
      .eq('profile_id', myId)
      .in('post_id', postIds);

    if (myLikesError) throw myLikesError;

    for (const row of myLikes ?? []) {
      likedSet.add((row as { post_id: string }).post_id);
    }
  }

  return posts.map((post) => ({
    ...post,
    like_count: countMap.get(post.id) ?? 0,
    liked_by_me: likedSet.has(post.id),
  }));
}

async function fetchThreadPosts(
  rootPostId: string,
  myId: string | null
): Promise<TimelinePost[]> {
  const collected = new Map<string, TimelinePost>();
  let parentIds: string[] = [rootPostId];

  while (parentIds.length > 0) {
    const targetIds = [...parentIds];
    parentIds = [];

    const { data, error } = await supabase
      .from('timeline_posts')
      .select('*, profiles:profile_id (id, nickname, avatar_url)')
      .or(
        `id.in.(${targetIds.join(',')}),reply_to_id.in.(${targetIds.join(',')})`
      )
      .order('created_at', { ascending: true });

    if (error) throw error;

    for (const row of (data ?? []) as TimelinePost[]) {
      if (!collected.has(row.id)) {
        collected.set(row.id, row);

        if (row.reply_to_id && targetIds.includes(row.reply_to_id)) {
          parentIds.push(row.id);
        }
      }
    }
  }

  const posts = Array.from(collected.values());
  const hydrated = await attachLikesToPosts(posts, myId);

  return hydrated.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

function buildDepthMap(posts: TimelinePost[], rootPostId: string) {
  const postMap = new Map(posts.map((post) => [post.id, post]));
  const depthMap = new Map<string, number>();

  const getDepth = (post: TimelinePost): number => {
    if (post.id === rootPostId) return 0;
    if (depthMap.has(post.id)) return depthMap.get(post.id)!;

    let depth = 1;
    let cursor = post;

    while (cursor.reply_to_id) {
      if (cursor.reply_to_id === rootPostId) break;

      const parent = postMap.get(cursor.reply_to_id);
      if (!parent) break;

      depth += 1;
      cursor = parent;

      if (depth >= 6) break;
    }

    depthMap.set(post.id, depth);
    return depth;
  };

  for (const post of posts) {
    depthMap.set(post.id, getDepth(post));
  }

  return depthMap;
}

export default function TimelineThreadPage() {
  const { fixtureId, postId } = useParams<{
    fixtureId: string;
    postId: string;
  }>();
  const router = useRouter();

  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [rootPost, setRootPost] = useState<TimelinePost | null>(null);
  const [threadPosts, setThreadPosts] = useState<TimelinePost[]>([]);
  const [loading, setLoading] = useState(true);

  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);

  const [myId, setMyId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<TimelineProfile | null>(null);

  const [reportingId, setReportingId] = useState<string | null>(null);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [animatingLikeId, setAnimatingLikeId] = useState<string | null>(null);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [replyToPost, setReplyToPost] = useState<TimelinePost | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const replies = useMemo(
    () =>
      threadPosts.filter(
        (post) =>
          post.id !== postId &&
          !post.is_hidden &&
          !post.is_deleted &&
          (!fixture?.expires_at ||
            new Date(fixture.expires_at).getTime() > Date.now())
      ),
    [threadPosts, postId, fixture]
  );

  const depthMap = useMemo(
    () => buildDepthMap(threadPosts, postId),
    [threadPosts, postId]
  );

  const reloadThread = useCallback(
    async (nextMyId: string | null) => {
      const posts = await fetchThreadPosts(postId, nextMyId);
      const nextRoot = posts.find((post) => post.id === postId) ?? null;

      setRootPost(nextRoot);
      setThreadPosts(posts);

      if (!replyToPost || !posts.some((post) => post.id === replyToPost.id)) {
        setReplyToPost(nextRoot);
      }
    },
    [postId, replyToPost]
  );

  useEffect(() => {
    if (!selectedImage) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedImage);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedImage]);

  useEffect(() => {
    if (!modalImage) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [modalImage]);

  const handleDownloadImage = useCallback(async () => {
    if (!modalImage) return;

    try {
      const res = await fetch(modalImage);
      if (!res.ok) {
        throw new Error('画像の取得に失敗しました。');
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const extensionMatch = modalImage.match(/\.(jpg|jpeg|png|webp)(\?|$)/i);
      const ext = extensionMatch?.[1]?.toLowerCase() ?? 'jpg';
      const filename = `timeline-image.${ext === 'jpeg' ? 'jpg' : ext}`;

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.alert('保存に失敗しました。');
    }
  }, [modalImage]);

  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          router.replace('/');
          return;
        }

        setMyId(user.id);

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, nickname, avatar_url')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        setMyProfile((profileData ?? null) as TimelineProfile | null);

        const { data: fixtureData, error: fixtureError } = await supabase
          .from('fixtures')
          .select('*')
          .eq('id', fixtureId)
          .single();

        if (fixtureError) throw fixtureError;

        const nextFixture = fixtureData as Fixture;

        if (
          nextFixture.expires_at &&
          new Date(nextFixture.expires_at).getTime() <= Date.now()
        ) {
          router.replace(`/timeline/${fixtureId}`);
          return;
        }

        setFixture(nextFixture);
        await reloadThread(user.id);
      } catch (e) {
        window.alert(
          e instanceof Error
            ? e.message
            : 'スレッドの読み込みに失敗しました。'
        );
        router.replace(`/timeline/${fixtureId}`);
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, [fixtureId, postId, reloadThread, router]);

  useEffect(() => {
    const channel = supabase
      .channel(`timeline-thread-${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timeline_posts',
          filter: `fixture_id=eq.${fixtureId}`,
        },
        async () => {
          try {
            await reloadThread(myId);
          } catch (error) {
            console.error('thread realtime reload error:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timeline_likes',
        },
        async () => {
          try {
            await reloadThread(myId);
          } catch (error) {
            console.error('thread likes reload error:', error);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fixtureId, myId, postId, reloadThread]);

  const handlePickImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      window.alert('jpg / png / webp の画像のみ投稿できます。');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      window.alert('画像サイズは5MB以下にしてください。');
      e.target.value = '';
      return;
    }

    setSelectedImage(file);
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    setPreviewUrl(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendPost = async (e: FormEvent) => {
    e.preventDefault();

    const content = value.trim();
    if ((!content && !selectedImage) || sending || !replyToPost) return;

    setSending(true);

    try {
      const profileId = await currentUserId();

      if (!profileId) {
        throw new Error('ログイン情報が見つかりません。');
      }

      const expiresAt = fixture?.expires_at
        ? fixture.expires_at
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      let imageUrl: string | null = null;

      if (selectedImage) {
        const storagePath = createStoragePath(profileId, selectedImage);

        const { error: uploadError } = await supabase.storage
          .from('timeline-images')
          .upload(storagePath, selectedImage, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('timeline-images')
          .getPublicUrl(storagePath);

        imageUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase.from('timeline_posts').insert({
        fixture_id: fixtureId,
        profile_id: profileId,
        content: content || null,
        image_url: imageUrl,
        reply_to_id: replyToPost.id,
        expires_at: expiresAt,
      });

      if (error) throw error;

      setValue('');
      clearSelectedImage();
      setReplyToPost(rootPost);
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : '返信に失敗しました。'
      );
    } finally {
      setSending(false);
    }
  };

  const deletePost = async (targetPostId: string) => {
    const confirmed = window.confirm('この投稿を削除しますか？');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('timeline_posts')
        .update({ is_deleted: true })
        .eq('id', targetPostId);

      if (error) throw error;
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : '投稿の削除に失敗しました。'
      );
    }
  };

  const reportPost = async (targetPostId: string) => {
    const confirmed = window.confirm('この投稿を通報しますか？');
    if (!confirmed) return;

    setReportingId(targetPostId);

    try {
      const reporterId = await currentUserId();

      if (!reporterId) {
        throw new Error('ログイン情報が見つかりません。');
      }

      const { error } = await supabase.from('timeline_post_reports').insert({
        post_id: targetPostId,
        reporter_profile_id: reporterId,
      });

      if (error) throw error;

      window.alert('通報を受け付けました。');
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : '通報に失敗しました。'
      );
    } finally {
      setReportingId(null);
    }
  };

  const toggleLike = async (post: TimelinePost) => {
    if (!myId || likingId) return;

    setLikingId(post.id);

    const previousLiked = !!post.liked_by_me;
    const previousCount = post.like_count ?? 0;

    if (!previousLiked) {
      setAnimatingLikeId(post.id);
      window.setTimeout(() => {
        setAnimatingLikeId((current) =>
          current === post.id ? null : current
        );
      }, 520);
    }

    setThreadPosts((prev) =>
      prev.map((item) =>
        item.id === post.id
          ? {
              ...item,
              liked_by_me: !previousLiked,
              like_count: previousLiked
                ? Math.max(0, previousCount - 1)
                : previousCount + 1,
            }
          : item
      )
    );

    if (rootPost?.id === post.id) {
      setRootPost((prev) =>
        prev
          ? {
              ...prev,
              liked_by_me: !previousLiked,
              like_count: previousLiked
                ? Math.max(0, previousCount - 1)
                : previousCount + 1,
            }
          : prev
      );
    }

    try {
      if (previousLiked) {
        const { error } = await supabase
          .from('timeline_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('profile_id', myId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('timeline_likes').insert({
          post_id: post.id,
          profile_id: myId,
        });

        if (error) throw error;
      }
    } catch (e) {
      setThreadPosts((prev) =>
        prev.map((item) =>
          item.id === post.id
            ? {
                ...item,
                liked_by_me: previousLiked,
                like_count: previousCount,
              }
            : item
        )
      );

      if (rootPost?.id === post.id) {
        setRootPost((prev) =>
          prev
            ? {
                ...prev,
                liked_by_me: previousLiked,
                like_count: previousCount,
              }
            : prev
        );
      }

      setAnimatingLikeId((current) =>
        current === post.id ? null : current
      );

      window.alert(
        e instanceof Error ? e.message : 'いいねに失敗しました。'
      );
    } finally {
      setLikingId(null);
    }
  };

  const openThread = (targetPost: TimelinePost) => {
    router.push(`/timeline/${fixtureId}/post/${targetPost.id}`);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),rgba(4,8,7,0.98)_38%,rgba(1,3,2,1)_100%)] px-4 pt-4 text-textMain">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm text-textSub">読み込み中...</p>
        </div>
      </main>
    );
  }

  if (!fixture || !rootPost) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),rgba(4,8,7,0.98)_38%,rgba(1,3,2,1)_100%)] px-4 pt-4 text-textMain">
        <div className="mx-auto max-w-3xl">
          <Link
            href={`/timeline/${fixtureId}`}
            className="text-xs text-accent"
          >
            ← タイムラインへ戻る
          </Link>
          <p className="mt-6 text-sm text-textSub">
            投稿が見つかりませんでした。
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),rgba(4,8,7,0.98)_38%,rgba(1,3,2,1)_100%)] pb-44 text-textMain">
      <div className="mx-auto max-w-3xl px-4 pt-4">
        <Link href={`/timeline/${fixtureId}`} className="text-xs text-accent">
          ← タイムライン一覧へ
        </Link>

        <div className="mt-4 rounded-2xl border border-white/10 bg-panel/70 p-3 text-xs text-textSub">
          スレッド
        </div>

        <section className="mt-4 space-y-4">
          <TimelinePostCard
            post={rootPost}
            mine={myId === rootPost.profile_id}
            reporting={reportingId === rootPost.id}
            liking={likingId === rootPost.id}
            animateLike={animatingLikeId === rootPost.id}
            onProfileClick={(profileId) =>
              router.push(`/profile/${profileId}`)
            }
            onImageClick={(imageUrl) => setModalImage(imageUrl)}
            onReport={(targetPostId) => void reportPost(targetPostId)}
            onDelete={(targetPostId) => void deletePost(targetPostId)}
            onLike={(targetPost) => void toggleLike(targetPost)}
            onReply={(targetPost) => setReplyToPost(targetPost)}
            onOpenThread={() => {}}
          />

          {replies.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-panel/60 p-5 text-sm text-textSub">
              まだ返信はありません。最初の返信をしてみよう。
            </div>
          ) : (
            replies.map((reply) => {
              const depth = Math.min(depthMap.get(reply.id) ?? 1, 4);

              return (
                <div
                  key={reply.id}
                  className="relative"
                  style={{ marginLeft: `${(depth - 1) * 14}px` }}
                >
                  {depth > 0 && (
                    <div
                      className="absolute left-[-10px] top-0 h-full w-px bg-white/10"
                      aria-hidden="true"
                    />
                  )}

                  <TimelinePostCard
                    post={reply}
                    mine={myId === reply.profile_id}
                    reporting={reportingId === reply.id}
                    liking={likingId === reply.id}
                    animateLike={animatingLikeId === reply.id}
                    onProfileClick={(profileId) =>
                      router.push(`/profile/${profileId}`)
                    }
                    onImageClick={(imageUrl) => setModalImage(imageUrl)}
                    onReport={(targetPostId) => void reportPost(targetPostId)}
                    onDelete={(targetPostId) => void deletePost(targetPostId)}
                    onLike={(targetPost) => void toggleLike(targetPost)}
                    onReply={(targetPost) => setReplyToPost(targetPost)}
                    onOpenThread={(targetPost) => openThread(targetPost)}
                  />
                </div>
              );
            })
          )}
        </section>

        <TimelineComposer
          value={value}
          sending={sending}
          previewUrl={previewUrl}
          selectedImage={selectedImage}
          myProfile={myProfile}
          fileInputRef={fileInputRef}
          replyToPost={replyToPost}
          onSubmit={sendPost}
          onChangeValue={setValue}
          onPickImage={handlePickImage}
          onChangeImage={handleImageChange}
          onClearImage={clearSelectedImage}
          onClearReply={() => setReplyToPost(rootPost)}
        />

        {modalImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4"
            onClick={() => setModalImage(null)}
          >
            <div
              className="relative w-full max-w-5xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setModalImage(null)}
                className="absolute right-2 top-2 z-10 rounded-full bg-black/70 px-3 py-1 text-sm text-white"
              >
                ×
              </button>

              <img
                src={modalImage}
                alt="expanded"
                className="max-h-[88vh] w-full rounded-2xl object-contain"
              />

              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => void handleDownloadImage()}
                  className="rounded-full border border-white/10 bg-panelSoft px-4 py-2 text-sm text-white transition hover:border-accent/30"
                >
                  画像を保存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}