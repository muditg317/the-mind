"use client"

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "~/trpc/react";


export function GameView({ room, initialPlayers }: { room: string, initialPlayers: string[]}) {
  const router = useRouter();
  const [playerList, setPlayerList] = useState<string[]>(initialPlayers);

  const playerName = localStorage.getItem("playerName") || "";
  console.log(`loaded playername ${playerName}`)

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
    if (!playerName || !playerList.includes(playerName)) {
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

  return <>
    Yay you're in the {room} and your name is {playerName}. current players: |{playerList}|
  </>
}