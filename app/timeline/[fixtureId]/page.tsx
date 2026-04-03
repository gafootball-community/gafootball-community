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
import { TimelineHeader } from '@/components/timeline/TimelineHeader';
import { TimelinePostCard } from '@/components/timeline/TimelinePostCard';
import { TimelineComposer } from '@/components/timeline/TimelineComposer';

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

type TimelinePostRow = Omit<
  TimelinePost,
  'profiles' | 'like_count' | 'liked_by_me'
>;

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

async function fetchPostWithProfile(
  postId: string,
  myId: string | null
): Promise<TimelinePost | null> {
  const { data, error } = await supabase
    .from('timeline_posts')
    .select('*, profiles:profile_id (id, nickname, avatar_url)')
    .eq('id', postId)
    .single();

  if (error) {
    console.error('fetchPostWithProfile error:', error);
    return null;
  }

  const hydrated = await attachLikesToPosts(
    [(data ?? null) as TimelinePost].filter(Boolean) as TimelinePost[],
    myId
  );

  return hydrated[0] ?? null;
}

export default function TimelineDetailPage() {
  const { fixtureId } = useParams<{ fixtureId: string }>();
  const router = useRouter();

  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [posts, setPosts] = useState<TimelinePost[]>([]);
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

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const refreshOnePost = useCallback(
    async (postId: string) => {
      const refreshed = await fetchPostWithProfile(postId, myId);
      if (!refreshed) return;

      setPosts((prev) =>
        prev.map((post) => (post.id === postId ? refreshed : post))
      );
    },
    [myId]
  );

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
          router.replace('/timeline');
          return;
        }

        const { data: postData, error: postError } = await supabase
          .from('timeline_posts')
          .select('*, profiles:profile_id (id, nickname, avatar_url)')
          .eq('fixture_id', fixtureId)
          .order('created_at', { ascending: false });

        if (postError) throw postError;

        const hydratedPosts = await attachLikesToPosts(
          (postData ?? []) as TimelinePost[],
          user.id
        );

        setFixture(nextFixture);
        setPosts(hydratedPosts);
      } catch (e) {
        window.alert(
          e instanceof Error
            ? e.message
            : 'タイムラインの読み込みに失敗しました。'
        );
        router.replace('/timeline');
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, [fixtureId, router]);

  useEffect(() => {
    const channel = supabase
      .channel(`timeline-${fixtureId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'timeline_posts',
          filter: `fixture_id=eq.${fixtureId}`,
        },
        async (payload) => {
          const newRow = payload.new as TimelinePostRow;
          const hydrated = await fetchPostWithProfile(newRow.id, myId);

          if (!hydrated) return;

          setPosts((prev) => {
            const exists = prev.some((post) => post.id === hydrated.id);
            if (exists) return prev;
            return [hydrated, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'timeline_posts',
          filter: `fixture_id=eq.${fixtureId}`,
        },
        async (payload) => {
          const updatedRow = payload.new as TimelinePostRow;
          const hydrated = await fetchPostWithProfile(updatedRow.id, myId);

          setPosts((prev) =>
            prev.map((post) => {
              if (post.id !== updatedRow.id) return post;
              return hydrated ?? { ...post, ...updatedRow };
            })
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'timeline_posts',
          filter: `fixture_id=eq.${fixtureId}`,
        },
        (payload) => {
          const deletedRow = payload.old as TimelinePostRow;
          setPosts((prev) => prev.filter((post) => post.id !== deletedRow.id));
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timeline_likes',
        },
        async (payload) => {
          const likeRow = (payload.new ?? payload.old) as
            | { post_id?: string }
            | null;

          const changedPostId = likeRow?.post_id;
          if (!changedPostId) return;

          void refreshOnePost(changedPostId);
        }
      )
      .subscribe((status) => {
        console.log('timeline realtime status:', status);
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fixtureId, myId, refreshOnePost]);

  const visiblePosts = useMemo(
    () =>
      posts.filter(
        (post) =>
          !post.is_hidden &&
          !post.is_deleted &&
          (!fixture?.expires_at ||
            new Date(fixture.expires_at).getTime() > Date.now())
      ),
    [posts, fixture]
  );

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
    if ((!content && !selectedImage) || sending) return;

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
        expires_at: expiresAt,
      });

      if (error) throw error;

      setValue('');
      clearSelectedImage();
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : '投稿に失敗しました。'
      );
    } finally {
      setSending(false);
    }
  };

  const deletePost = async (postId: string) => {
    const confirmed = window.confirm('この投稿を削除しますか？');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('timeline_posts')
        .update({ is_deleted: true })
        .eq('id', postId);

      if (error) throw error;

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, is_deleted: true } : post
        )
      );
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : '投稿の削除に失敗しました。'
      );
    }
  };

  const reportPost = async (postId: string) => {
    const confirmed = window.confirm('この投稿を通報しますか？');
    if (!confirmed) return;

    setReportingId(postId);

    try {
      const reporterId = await currentUserId();

      if (!reporterId) {
        throw new Error('ログイン情報が見つかりません。');
      }

      const { error } = await supabase.from('timeline_post_reports').insert({
        post_id: postId,
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

    setPosts((prev) =>
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
      setPosts((prev) =>
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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),rgba(4,8,7,0.98)_38%,rgba(1,3,2,1)_100%)] pb-44 text-textMain">
      <div className="mx-auto max-w-3xl px-4 pt-4">
        <Link href="/timeline" className="text-xs text-accent">
          ← タイムライン一覧へ
        </Link>

        {loading ? (
          <p className="mt-6 text-sm text-textSub">読み込み中...</p>
        ) : fixture ? (
          <>
            <TimelineHeader fixture={fixture} />

            <section className="mt-5 space-y-4">
              {visiblePosts.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-panel/80 p-5 text-sm text-textSub">
                  まだ投稿はありません。最初の投稿をしてみよう。
                </div>
              ) : (
                visiblePosts.map((post) => (
                  <TimelinePostCard
                    key={post.id}
                    post={post}
                    mine={myId === post.profile_id}
                    reporting={reportingId === post.id}
                    liking={likingId === post.id}
                    animateLike={animatingLikeId === post.id}
                    onProfileClick={(profileId) =>
                      router.push(`/profile/${profileId}`)
                    }
                    onImageClick={(imageUrl) => setModalImage(imageUrl)}
                    onReport={(postId) => void reportPost(postId)}
                    onDelete={(postId) => void deletePost(postId)}
                    onLike={(targetPost) => void toggleLike(targetPost)}
                  />
                ))
              )}
            </section>

            <TimelineComposer
              value={value}
              sending={sending}
              previewUrl={previewUrl}
              selectedImage={selectedImage}
              myProfile={myProfile}
              fileInputRef={fileInputRef}
              onSubmit={sendPost}
              onChangeValue={setValue}
              onPickImage={handlePickImage}
              onChangeImage={handleImageChange}
              onClearImage={clearSelectedImage}
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
                    <a
                      href={modalImage}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-white/10 bg-panelSoft px-4 py-2 text-sm text-white transition hover:border-accent/30"
                    >
                      画像を保存
                    </a>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}