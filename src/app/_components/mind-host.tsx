"use client"

import { api } from "@_trpc/react";
import { type MindUserPresence } from "@lib/mind";

interface MindHostFragmentProps {
  mindUser: MindUserPresence
}
export default function MindHostFragment({ mindUser }: MindHostFragmentProps) {
  const locked = api.room.isLocked.useQuery({roomName: mindUser.roomName});
  const toggleRoomLock = api.room.toggleRoomLock.useMutation({
    onSuccess: async () => {
      await locked.refetch();
    }
  });

  return (<>
    <h2 className="text-2xl">Host Controls:</h2>
    {locked.isSuccess && <button
        className="px-10 py-3 font-semibold transition rounded-full bg-white/10 hover:bg-white/20"
        onClick={e => {
          e.preventDefault();
          toggleRoomLock.mutate(mindUser);
        }}
      >
      {locked.data ? "unlock room" : "lock room"}
    </button>}
  </>)
}