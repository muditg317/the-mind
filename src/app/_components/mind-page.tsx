"use client"

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@_trpc/react"
import { PusherClientProvider } from "@pusher/react";
import type { MindUser, MindUserId, MindUserPresence } from "@lib/mind";
import { arrayContainsMatchingPlayer, gameChannelName, userId } from "@lib/mind";
import { useMemberTracker } from "@pusher/react/hooks";
import MindHostFragment from "./mind-host";

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
  const router = useRouter();
  const game_channel_name = gameChannelName(roomName);
  const activePlayers = useMemberTracker<MindUser, MindUserId>(game_channel_name, useCallback((member: MindUserPresence) => member, []));
  const [allPlayers, setAllPlayers] = useState<MindUserPresence[]>([]);
  const [isHost, setIsHost] = useState(false);
  const inactivePlayers = useMemo(() => {
    const inactive = allPlayers
      .filter(
        player => !arrayContainsMatchingPlayer(activePlayers, player)
      );
    return inactive;
  }, [activePlayers, allPlayers]);

  const playerInfoQuery = api.room.playerInfo.useQuery({
    roomName,
    playerName
  });
  useEffect(() => {
    if (playerInfoQuery.isError) {
      const code = playerInfoQuery.error.data?.code;
      if (code === "UNAUTHORIZED" || code === "BAD_REQUEST") {
        router.replace("/");
      }
    }
    if (playerInfoQuery.isSuccess) {
      console.log("got players:", playerInfoQuery.data.playerNames);
      setAllPlayers(playerInfoQuery.data.playerNames.map(name => ({
        user_id: userId({roomName, playerName: name}),
        roomName,
        playerName: name
      })));
      setIsHost(playerInfoQuery.data.hostName === playerName);
    }
  }, [router, playerName, roomName, playerInfoQuery.isError, playerInfoQuery.error, playerInfoQuery.isSuccess, playerInfoQuery.data]);

  useEffect(() => {
    void playerInfoQuery.refetch();
  }, [activePlayers, playerInfoQuery]);

  const currentPlayer = activePlayers.find(player => player.user_id === userId({roomName, playerName}));

  const [filteredActive, imposterPlayers] = useMemo(() => {
    const filtered: MindUserPresence[] = [];
    const imposters: MindUserPresence[] = []
    activePlayers.forEach(activePlayer => {
      if (!allPlayers.length || arrayContainsMatchingPlayer(allPlayers, activePlayer)) {
        filtered.push(activePlayer);
      } else {
        imposters.push(activePlayer);
      }
    });
    if (imposters.length) {
      console.log(`BRUH THERE IS AN IMPOSTER OH NOOOOOOO -- ${imposters.length} imposters`);
      console.table(imposters);
    }
    return [filtered, imposters];
  }, [activePlayers, allPlayers]);


  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#bae5ff] to-[#343aae] text-white">
      <div className="container flex flex-col items-center justify-start min-h-screen gap-12 p-4 pt-8">
        {(isHost && !!currentPlayer) && (
          <div className="w-full p-4 m-2 mb-auto rounded-xl shadow-inner-lg justify-self-start">
            <MindHostFragment mindUser={currentPlayer} />
          </div>
        )}
        <div className="w-full p-4 m-2 mt-auto rounded-xl shadow-inner-lg justify-self-end">
          <h2 className="text-2xl">PlayerInfo:</h2>
          {!!filteredActive.length && <>
            <h3 className="w-full text-center">Active Players:</h3>
            <div className="flex gap-4 bg-gray-500/50">{filteredActive.map((player, i) => (
              <p key={i}>{`${player.playerName}${player.playerName === playerName ? " (you)" : ""}`}</p>
            ))}</div>
          </>}
          {!!inactivePlayers.length && <>
            <h3 className="w-full text-center">Inactive Players:</h3>
            <div className="flex gap-4 bg-gray-500/50">{inactivePlayers.map((player, i) => (
              <p key={i}>{`${player.playerName}${player.playerName === playerName ? " (you)" : ""}`}</p>
            ))}</div>
          </>}
          {!!imposterPlayers.length && <>
            <h3 className="w-full text-center">Imposters!!:</h3>
            <div className="flex gap-4 bg-gray-500/50">{imposterPlayers.map((player, i) => (
              <p key={i}>{`${player.playerName}${player.playerName === playerName ? " (you)" : ""}`}</p>
            ))}</div>
          </>}
        </div>
      </div>
    </main>
  );
}