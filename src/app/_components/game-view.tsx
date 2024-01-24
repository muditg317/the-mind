"use client"

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { type PresenceChannel } from "pusher-js"

import { api } from "@_trpc/react";
import { PusherProvider, usePusherChannel, usePusherEventSubscribe, usePusherPresenceEventSubscribe } from "@context/pusher"



function GameView_Inner({ room, initialPlayers, playerName }: { room: string, initialPlayers: Record<string,string>, playerName: string }) {
  const router = useRouter();
  const [playerList, setPlayerList] = useState<Record<string, string>>(initialPlayers);

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

  const channel = usePusherChannel({ room });
  const checkIn = api.games.checkIn.useMutation({
    onSuccess: console.log
  });
  console.log(channel);
  // checkIn.mutate({
  //   roomName: room,
  //   playerName,
  //   socket_id: channel.presenceChannel.members.myID
  // })

  usePusherEventSubscribe({ room }, "new-player", (data: string) => {
    console.log(`got new-player event: ${data}`);
  });
  usePusherPresenceEventSubscribe({ room }, "pusher:subscription_succeeded", function (presenceChannel: PresenceChannel, members: PresenceChannel["members"]) {
    // const me = presenceChannel.members.me;
    console.log(`got subscription event: `, members);
  });

  return <>
    <p>
      ROOM: {room}
    </p>
    <p>
      NAME: {playerName}
    </p>
    <p>
      PLAYERS: [{Object.entries(playerList).map(([player_name, info]) => (
        <span key={player_name}>&nbsp;{player_name}-|{info}|</span>
      ))}]
    </p>
  </>
}

export default function GameView({ room, initialPlayers }: { room: string, initialPlayers: Record<string,string>}) {
  const playerName = typeof window !== "undefined" && localStorage.getItem("playerName") || "";
  // console.log(`loaded playername ${playerName}`);

  return (
  <PusherProvider>
    <GameView_Inner room={room} initialPlayers={initialPlayers} playerName={playerName} />
  </PusherProvider>
  );
}