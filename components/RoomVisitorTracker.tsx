'use client';

import { useEffect } from 'react';
import { deleteRoomVisitor, upsertRoomVisitor } from '@/lib/roomVisitors';

type Props = {
  profileId: string;
  roomSlug: string;
};

export default function RoomVisitorTracker({ profileId, roomSlug }: Props) {
  useEffect(() => {
    if (!profileId || !roomSlug) return;

    upsertRoomVisitor(profileId, roomSlug);

    const interval = setInterval(() => {
      upsertRoomVisitor(profileId, roomSlug);
    }, 30000);

    return () => {
      clearInterval(interval);
      deleteRoomVisitor(profileId);
    };
  }, [profileId, roomSlug]);

  return null;
}