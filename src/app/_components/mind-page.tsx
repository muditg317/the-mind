"use client"

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { api } from "@_trpc/react"
import { PusherClientProvider } from "@pusher/react";
import type { MindPublicGameState, MindUser, MindUserPresence, MindLocalGameState } from "@lib/mind";
import { userId } from "@lib/mind";
import MindHostFragment from "./mind-host";
import { useGamePlayerTracker, useGameStateReducer } from "@lib/mindHooks";
import { cn } from "@lib/utils";

const UNKNOWN_NAME = "###_UNKNOWN_###";

interface MindPageProps {
  mindUserInfo: Omit<MindUser, "playerName">;
  initialGameState: MindPublicGameState;
}
export default function MindPage({ mindUserInfo, initialGameState }: MindPageProps) {
  const router = useRouter();
  const playerName = localStorage.getItem("playerName") ?? UNKNOWN_NAME;
  if (!playerName) {
    alert("No playerName loaded. if something is broken, just use \`localStorage.setItem(\"playerName\", \"<name>\")\` and reload.");
    router.replace("/");
  }
  const mindUser = {
    ...mindUserInfo,
    playerName
  }

  const initialPlayerInfo = api.room.playerInfo.useQuery(mindUser);
  useEffect(() => {
    if (initialPlayerInfo.isError) {
      const code = initialPlayerInfo.error.data?.code;
      // console.log("initialPlayerInfo failed with error", initialPlayerInfo.error);
      if (code === "UNAUTHORIZED" || code === "BAD_REQUEST") {
        router.replace("/");
      }
    }
  }, [router, playerName, initialPlayerInfo.isError, initialPlayerInfo.error]);

  if (playerName === UNKNOWN_NAME) {
    router.replace("/");
  }

  return (
    <PusherClientProvider mindUser={mindUser}>
      {(initialPlayerInfo.isSuccess && !!initialPlayerInfo.data)
        ? <Content initialState={{
            playerName,
            roomName: mindUserInfo.roomName,
            playerInfo: initialPlayerInfo.data,
            gameState: initialGameState,
        }} />
        : null
      }
    </PusherClientProvider>
  )
}


function Content({initialState}: {initialState: MindLocalGameState}) {
  const { playerName, roomName } = initialState;
  const user_id = userId({ playerName, roomName });
  const {
    // allPlayers,
    activePlayers,
    inactivePlayers,
    imposterPlayers,
    currentPlayer,
    hostPlayer
  } = useGamePlayerTracker({ playerName, roomName, user_id });
  const isHost = !!(
    currentPlayer
    && hostPlayer
    && currentPlayer.user_id === hostPlayer.user_id
  );

  api.room.pingForUpdate.useQuery({ playerName, roomName });

  // console.log("initial",initialState);
  const gameState = useGameStateReducer(initialState);
  // console.log("setup",gameState);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#bae5ff] to-[#343aae] text-white">
      <div className="container flex flex-col items-center justify-start min-h-screen gap-2 p-4 pt-8">
        <h1 className="text-4xl font-bold w-full text-center flex justify-center items-center gap-12">
          <p>{`Room: ${roomName}`}</p>
          <p>{`Your name: ${playerName}`}</p>
        </h1>

        {(!!gameState.playerInfo && !!gameState.gameState)
          ? <GameFragment
              currentPlayer={{
                roomName: gameState.roomName,
                playerName: gameState.playerName,
                user_id: userId(gameState)
              }}
              playerInfo={gameState.playerInfo}
              gameState={gameState.gameState}
              isHost={isHost}
            />
          : null}

        <div className="w-full p-4 m-2 mt-auto rounded-xl shadow-inner-lg justify-self-end">
          <h2 className="text-2xl">PlayerInfo:</h2>
          {!!activePlayers.length && <>
            <h3 className="w-full text-center">Active Players:</h3>
            <div className="flex gap-4 bg-gray-500/50">{activePlayers.map((player, i) => (
              <PlayerDisplay key={i} playerName={player.playerName} you={playerName} host={hostPlayer?.playerName} />
            ))}</div>
          </>}
          {!!inactivePlayers.length && <>
            <h3 className="w-full text-center">Inactive Players:</h3>
            <div className="flex gap-4 bg-gray-500/50">{inactivePlayers.map((player, i) => (
              <PlayerDisplay key={i} playerName={player.playerName} you={playerName} host={hostPlayer?.playerName} />
            ))}</div>
          </>}
          {!!imposterPlayers.length && <>
            <h3 className="w-full text-center">Imposters!!:</h3>
            <div className="flex gap-4 bg-gray-500/50">{imposterPlayers.map((player, i) => (
              <PlayerDisplay key={i} playerName={player.playerName} you={playerName} host={hostPlayer?.playerName} />
            ))}</div>
          </>}
        </div>
      </div>
    </main>
  );
}

interface PlayerDisplayProps {
  playerName: string;
  you: string;
  host?: string;
}
function PlayerDisplay({playerName, you, host}: PlayerDisplayProps) {
  return (
    <p>
      {`${playerName}${playerName === host ? " (host)" : ""}${playerName === you ? " (you)" : ""}`}
    </p>
  );
}

interface GameFragmentProps {
  currentPlayer: MindUserPresence;
  playerInfo: NonNullable<MindLocalGameState["playerInfo"]>;
  gameState: NonNullable<MindLocalGameState["gameState"]>;
  isHost: boolean;
}
function GameFragment({currentPlayer, playerInfo, gameState, isHost}: GameFragmentProps) {
  const toggleReady = api.room.toggleReady.useMutation({});
  // console.log("render game fragment", {currentPlayer, playerInfo, gameState, isHost});
  
  const playerReady = playerInfo.ready ?? false;
  // console.log("ready", playerReady);

  const players = Object.entries(gameState.playerState).sort(([nameA],[nameB]) => {
    if (nameA === currentPlayer.playerName) return -1;
    if (nameB === currentPlayer.playerName) return 1;
    return 0;
  });

  const playCard = api.room.playCard.useMutation({});

  return (<>
    {isHost
      ? (<div className="w-full p-4 m-2 mb-auto rounded-xl shadow-inner-lg justify-self-start flex flex-row items-center gap-6">
          <MindHostFragment hostPlayer={currentPlayer} gameState={gameState} />
        </div>)
      : <div className="mb-auto"></div>
    }

    <p>Level {gameState.level}</p>
    <div
      className="flex flex-row gap-1 m-1"
    >{!!gameState.played_cards.length && gameState.played_cards.map(card => {
      return <Card key={card}
        value={card}
        faceUp={true}
      />
    })}</div>
    <div
      className="flex flex-row gap-4 m-4"
    >{!!players.length && players.map(([playerName, player]) => {
      return <div key={playerName} className="flex flex-col rounded-md border border-black border-thin gap-4 p-2">
        <h4 className="text-lg text-center w-full px-6">{playerName}</h4>
        {!!player.cardsLeft && <div className="flex flex-row gap-2 justify-center items-center">
          {new Array(player.cardsLeft).fill(null).map((_, i) => {
            const isCurrentPlayer = playerName === currentPlayer.playerName;
            const cardValue = isCurrentPlayer
              ? playerInfo.cards[i]!
              : player.visibleCards?.[i];
            return <Card key={i}
              value={cardValue}
              faceUp={cardValue !== undefined}
              className={isCurrentPlayer ? "bg-white/10 hover:bg-white/20" : ""}
              disabled={!isCurrentPlayer}
              onClick={e => {
                e.preventDefault();
                playCard.mutate({...currentPlayer, card: playerInfo.cards[i]!})
              }}
            />
          })}
        </div>}
      </div>
    })}</div>
    {!gameState.started ? (
      <button
          className="px-10 py-3 font-semibold transition rounded-full bg-white/10 hover:bg-white/20"
          onClick={e => {
            e.preventDefault();
            toggleReady.mutate(currentPlayer);
          }}
        >
        {playerReady ? "Un-ready" : "Ready Up!"}
      </button>
    ) : (<>
    </>)}
  </>)
}

type CardProps = {
  value?: number;
  faceUp: boolean
} & JSX.IntrinsicElements["button"];
function Card({ value, faceUp, ...buttonProps }: CardProps) {
  return <button
    {...buttonProps}
    className={cn(
      "w-10 h-14 font-semibold transition rounded-sm bg-blue-600/80 text-center align-middle",
      faceUp && "bg-white/10",
      buttonProps.className
    )}
    >{value ?? ""}
  </button>
}