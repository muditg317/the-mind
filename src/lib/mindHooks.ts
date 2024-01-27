"use client"

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@_trpc/react"
import type { MindUser, MindUserId, MindUserPresence } from "@lib/mind";
import { arrayContainsMatchingPlayer, gameChannelName, userId } from "@lib/mind";
import { useMemberTracker } from "@pusher/react/hooks";

export function useGamePlayerTracker({roomName, playerName}: MindUserPresence) {
  const router = useRouter();
  const game_channel_name = gameChannelName(roomName);

  const inChannelPlayers = useMemberTracker<MindUser, MindUserId>(game_channel_name, useCallback((member: MindUserPresence) => member, []));
  const [allPlayers, setAllPlayers] = useState<MindUserPresence[]>([]);
  const [hostName, setHostName] = useState<string>();
  const inactivePlayers = useMemo(() => {
    const inactive = allPlayers
      .filter(
        player => !arrayContainsMatchingPlayer(inChannelPlayers, player)
      );
    return inactive;
  }, [inChannelPlayers, allPlayers]);

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
      setHostName(playerInfoQuery.data.hostName);
    }
  }, [router, playerName, roomName, playerInfoQuery.isError, playerInfoQuery.error, playerInfoQuery.isSuccess, playerInfoQuery.data]);

  useEffect(() => {
    void playerInfoQuery.refetch();
  }, [inChannelPlayers, playerInfoQuery]);

  const currentPlayer = inChannelPlayers.find(player => player.user_id === userId({roomName, playerName}));
  const hostPlayer = inChannelPlayers.find(player => player.user_id === userId({roomName, playerName: hostName}));

  const [activePlayers, imposterPlayers] = useMemo(() => {
    const filtered: MindUserPresence[] = [];
    const imposters: MindUserPresence[] = []
    inChannelPlayers.forEach(activePlayer => {
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
  }, [inChannelPlayers, allPlayers]);

  return {
    allPlayers,
    activePlayers,
    inactivePlayers,
    imposterPlayers,
    currentPlayer,
    hostPlayer
  }
}