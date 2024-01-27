"use client"

import { api } from "@_trpc/react";
import { type MindUserPresence } from "@lib/mind";

interface MindHostFragmentProps {
  mindUser: MindUserPresence
}
export default function MindHostFragment({ mindUser }: MindHostFragmentProps) {
  const locked = api.room.isLocked.useQuery({roomName: mindUser.roomName});
  // const toggleRoomLock = api.room.toggleRoomLock.useMutation({roomName, playerName})

  return (<>
    <h2 className="text-2xl">Host Controls:</h2>
    <button className="px-10 py-3 font-semibold transition rounded-full bg-white/10 hover:bg-white/20" >{locked ? "unlock room" : "lock room"}</button>
  </>)
}