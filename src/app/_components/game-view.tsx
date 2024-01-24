"use client"

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@_trpc/react";

import { PusherProvider, useSubscribeToEvent } from "@lib/pusher"


function GameView_Inner({ room, initialPlayers, playerName }: { room: string, initialPlayers: string[], playerName: string }) {
  const router = useRouter();
  const [playerList, setPlayerList] = useState<string[]>(initialPlayers);

  const leaveGameMutation = api.games.leaveGame.useMutation()
  const exitGame = useCallback(() => {
    if (leaveGameMutation.isIdle) {
      leaveGameMutation.mutate({
        roomName: room,
        playerName
      });
    }
    router.push("/");
  }, [leaveGameMutation, room, playerName, router]);

  useEffect(() => {
    if (!playerName) {
      exitGame();
    }

    return () => {
      // if (leaveGameMutation.isIdle) {
      //   leaveGameMutation.mutate({
      //     roomName: room,
      //     playerName
      //   });
      // }
    };
  }, [playerName, playerList, exitGame]);

  useSubscribeToEvent("new-player", data => {
    console.log(`got new-player event: ${data}`);
  });

  return <>
   ROOM: {room}<br/>
   NAME: {playerName}<br/>
   PLAYERS: |{playerList}|
  </>
}

export function GameView({ room, initialPlayers }: { room: string, initialPlayers: string[]}) {
  const playerName = typeof window !== "undefined" && localStorage.getItem("playerName") || "";
  // console.log(`loaded playername ${playerName}`);

  return (
  <PusherProvider channel_slug={`room-${room}`}>
    <GameView_Inner room={room} initialPlayers={initialPlayers} playerName={playerName} />
  </PusherProvider>
  );
}