"use client"

import { api } from "@_trpc/react";
import type { MindUserId, MindUserPresence } from "@lib/mind";

interface MindHostFragmentProps {
  hostPlayer: MindUserPresence
  gameState: {
    started: boolean;
    level: number;
    played_cards: number[];
    playerState: Record<MindUserId, {
      ready: boolean;
      cardsLeft: number;
      cards?: number[] | undefined;
    }>;
  }
}
export default function MindHostFragment({ hostPlayer: mindUser, gameState }: MindHostFragmentProps) {
  const locked = api.room.isLocked.useQuery({roomName: mindUser.roomName});
  const toggleRoomLock = api.room.toggleRoomLock.useMutation({
    onSuccess: async () => {
      await locked.refetch();
    }
  });
  const startGame = api.room.startGame.useMutation({});

  const allPlayersReady = Object.values(
      gameState.playerState
    ).every(player => player.ready);

  return (<>
    <h2 className="text-2xl w-max">Host Controls:</h2>
    {locked.isSuccess && <button
        className="px-10 py-3 font-semibold transition rounded-full bg-white/10 hover:bg-white/20"
        disabled={gameState.started}
        onClick={e => {
          e.preventDefault();
          toggleRoomLock.mutate(mindUser);
        }}
      >
      {locked.data ? "unlock room" : "lock room"}
    </button>}
    {<button
        className="px-10 py-3 font-semibold transition rounded-full bg-white/10 hover:bg-white/20"
        disabled={!allPlayersReady || gameState.started}
        onClick={e => {
          e.preventDefault();
          startGame.mutate(mindUser);
        }}
      >
      {gameState.started ? "Game started!" : (allPlayersReady ? "Start game!" : "Players not ready...")}
    </button>}
  </>)
}