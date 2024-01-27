"use client"

import { useRouter } from "next/navigation";

import { api } from "@_trpc/react"
import { PusherClientProvider } from "@pusher/react";
import type { MindPublicGameState, MindUser, MindUserPresence } from "@lib/mind";
import { userId } from "@lib/mind";
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
    // allPlayers,
    activePlayers,
    inactivePlayers,
    imposterPlayers,
    currentPlayer,
    hostPlayer
  } = useGamePlayerTracker({ playerName, roomName, user_id });
  const isHost = currentPlayer?.user_id === hostPlayer?.user_id;

  const gameState = api.room.gameState.useQuery(mindUser); // TODO: replace with socket bruh wtf

  // TODO: if host - add kick buttons

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#bae5ff] to-[#343aae] text-white">
      <div className="container flex flex-col items-center justify-start min-h-screen gap-2 p-4 pt-8">
        <h1 className="text-4xl font-bold w-full text-center flex justify-center items-center gap-12">
          <p>{`Room: ${roomName}`}</p>
          <p>{`Your name: ${playerName}`}</p>
        </h1>

        {(gameState.isSuccess && gameState.data && !!currentPlayer)
          ? <GameFragment currentPlayer={currentPlayer} gameState={gameState.data} isHost={isHost} />
          : null}

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

interface GameFragmentProps {
  currentPlayer: MindUserPresence;
  gameState: MindPublicGameState;
  isHost: boolean;
}
function GameFragment({currentPlayer, gameState, isHost}: GameFragmentProps) {
  // const toggleReady = api.room.toggleReady.useMutation({});
  console.log(gameState);

  const playerReady = gameState.playerState[currentPlayer.user_id]!.ready;

  return (<>
    {isHost
      ? (<div className="w-full p-4 m-2 mb-auto rounded-xl shadow-inner-lg justify-self-start flex flex-row items-center gap-6">
          <MindHostFragment mindUser={currentPlayer} gameState={gameState} />
        </div>)
      : <div className="mb-auto"></div>
    }

    {!gameState.started && (
      <button
          className="px-10 py-3 font-semibold transition rounded-full bg-white/10 hover:bg-white/20"
          onClick={e => {
            e.preventDefault();
            // toggleReady.mutate(currentPlayer);
          }}
        >
        {playerReady ? "Un-ready" : "Ready Up!"}
      </button>
    )}
  </>)
}