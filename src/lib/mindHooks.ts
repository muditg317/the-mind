"use client"

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@_trpc/react"
import type { MindUser, MindUserId, MindUserPresence, MindLocalGameState, MindGameStateUpdate } from "@lib/mind";
import { STATE_UPDATE_PUSHER_EVENT, arrayContainsMatchingPlayer, gameChannelName, userId } from "@lib/mind";
import { useChannel, useEventSubscriptionReducer, useMemberTracker } from "@pusher/react/hooks";
import { usePusherClient } from "@pusher/react";

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

  const playersQuery = api.room.players.useQuery({
    roomName,
    playerName
  });
  useEffect(() => {
    if (playersQuery.isError) {
      const code = playersQuery.error.data?.code;
      console.log("playersQuery failed with error", playersQuery.error);
      if (code === "UNAUTHORIZED" || code === "BAD_REQUEST") {
        router.replace("/");
      }
    }
  }, [router, playerName, playersQuery.isError, playersQuery.error]);
  useEffect(() => {
    if (playersQuery.isSuccess) {
      // console.log("got players:", playerInfoQuery.data.playerNames);
      setAllPlayers(playersQuery.data.playerNames.map(name => ({
        user_id: userId({roomName, playerName: name}),
        roomName,
        playerName: name
      })));
      setHostName(playersQuery.data.hostName);
    }
  }, [roomName, playersQuery.isSuccess, playersQuery.data]);

  useEffect(() => {
    void playersQuery.refetch();
  }, [inChannelPlayers, playersQuery]);

  const currentPlayer = inChannelPlayers.find(player => player.user_id === userId({roomName, playerName}));
  const hostPlayer = hostName ? inChannelPlayers.find(player => player.user_id === userId({roomName, playerName: hostName})) : undefined;

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

function gameStateReducer(prevState: MindLocalGameState, action: MindGameStateUpdate) {
  // const newState = {...prevState};
  // console.log("got game update", action);
  const logFirst = <T>(obj: T) => {
    // console.log(obj);
    return obj;
  }
  switch (action.type) {
    case "playerInfo":
      // newState.playerInfo = action.playerInfo;
      // console.log("called playerInfo handler");
      return logFirst({...prevState, playerInfo: action.playerInfo});
    case "stateUpdate":
      // newState.gameState = action.newState;
      return logFirst({...prevState, gameState: action.newState});
    case "playerUpdate":
      if (prevState.gameState) {
        return logFirst({
          ...prevState,
          gameState: {
            ...prevState.gameState,
            playerState: {
              ...prevState.gameState.playerState,
              [action.playerName]: action.newInfo,
            }
          }
        });
      } else {
        return prevState;
      }
  }
  return prevState;
}

export function useGameStateReducer(initialState: MindLocalGameState) {
  const userChannel = usePusherClient().user;
  const gameChannel = useChannel(gameChannelName(initialState.roomName));
  return useEventSubscriptionReducer(
    [userChannel, gameChannel],
    STATE_UPDATE_PUSHER_EVENT,
    initialState,
    gameStateReducer
  );
}