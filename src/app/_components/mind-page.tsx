"use client"

import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "@_trpc/react"
import { PusherClientProvider, usePusherClient } from "@pusher/react";
import type { MindUser, MindUserId, MindUserPresence } from "@lib/mind";
import { gameChannelName, userId } from "@lib/mind";
import { useMemberTracker, useMutationOnSubscribe } from "@pusher/react/hooks";
import { useRouter } from "next/navigation";

interface MindPageProps {
  mindUserInfo: Omit<MindUser, "playerName">;
}
export default function MindPage({ mindUserInfo }: MindPageProps) {
  const router = useRouter();
  const playerName = localStorage.getItem("playerName");
  if (!playerName) {
    alert("No playerName loaded. if something is broken, just use \`localStorage.setItem(\"playerName\", \"<name>\")\` and reload.");
    router.replace("/");
    return;
  }
  const mindUser = {
    ...mindUserInfo,
    playerName
  }

  return (
    <PusherClientProvider mindUser={mindUser}>
      <Content {...mindUser} />
    </PusherClientProvider>
  )
}

function Content({ playerName, roomName }: MindUser) {
  const game_channel_name = gameChannelName(roomName);
  const activePlayers = useMemberTracker<MindUser, MindUserId>(game_channel_name, useCallback((member: MindUserPresence) => member, []));
  const [allPlayers, setAllPlayers] = useState<MindUserPresence[]>([]);
  const [isHost, setIsHost] = useState(false);
  const inactivePlayers = useMemo(() => {
    console.log("allplayers", allPlayers);
    console.log("active", activePlayers);
    const inactive = allPlayers.filter(player => {
      return !activePlayers.find(active => active.user_id === player.user_id);
    });
    console.log("inactive", inactive)
    return inactive
  }, [activePlayers, allPlayers]);

  useMutationOnSubscribe(game_channel_name, api.room.checkIn.useMutation({
    onSuccess: ({ playerNames, isHost: isGameHost }) => {
      setAllPlayers(playerNames.map(name => ({
        user_id: userId({roomName, playerName: name}),
        roomName,
        playerName: name
      })));
      setIsHost(isGameHost);
    }
  }), {
    playerName,
    roomName
  });
  const playerInfoQuery = api.room.playerInfo.useQuery({
    roomName,
    playerName
  });

  useEffect(() => {
    if (playerInfoQuery.isSuccess) {
      setAllPlayers(playerInfoQuery.data.playerNames.map(name => ({
        user_id: userId({roomName, playerName: name}),
        roomName,
        playerName: name
      })));
    }
    playerInfoQuery.refetch();
  }, [activePlayers]);


  return (<>
    <div className="mt-10 flex flex-col">
      <h2>Active Players:</h2>
      {!activePlayers.length ? "None" : activePlayers.map((player, i) => (
        <p key={i}>{`${player.playerName}${player.playerName === playerName ? " (you)" : ""}`}</p>
      ))}
     <h2>Inactive Players:</h2>
      {!inactivePlayers.length ? "None" : inactivePlayers.map((player, i) => (
        <p key={i}>{`${player.playerName}${player.playerName === playerName ? " (you)" : ""}`}</p>
      ))}
    </div>
    {isHost && <>
    <div className="mt-10">You're the host!</div>
    </>}
  </>)
}