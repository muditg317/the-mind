"use client"

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@_trpc/react"
import { PusherClientProvider } from "@pusher/react";
import type { MindUser, MindUserId, MindUserPresence } from "@lib/mind";
import { arrayContainsMatchingPlayer, gameChannelName, userId } from "@lib/mind";
import { useMemberTracker } from "@pusher/react/hooks";
import MindHostFragment from "./mind-host";
import { useGamePlayerTracker } from "@lib/mindHooks";

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

function Content(mindUser: MindUser) {
  const { playerName, roomName } = mindUser;
  const user_id = userId(mindUser);
  const {
    allPlayers: _allPlayers,
    activePlayers,
    inactivePlayers,
    imposterPlayers,
    currentPlayer,
    isHost
  } = useGamePlayerTracker({ playerName, roomName, user_id });

  const gameStatus = api.room.gameStatus.useQuery(mindUser);

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
          {!!activePlayers.length && <>
            <h3 className="w-full text-center">Active Players:</h3>
            <div className="flex gap-4 bg-gray-500/50">{activePlayers.map((player, i) => (
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