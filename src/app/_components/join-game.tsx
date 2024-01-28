"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

import { api } from "@_trpc/react";

// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
//   AlertDialogTrigger,
// } from "@components/ui/alert-dialog"
// import { Button } from "@components/ui/button"

export function JoinGame() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const availableRooms = api.games.getOpenRooms.useQuery(undefined, {
    keepPreviousData: true,
    staleTime: 1000,
    refetchInterval: 1000,
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: 'always',
  });
  const attemptJoin = api.games.attemptJoin.useMutation({
    onSuccess: ({roomName,playerName}) => {
      localStorage.setItem("playerName", playerName);
      router.push(`game/${roomName}`);
    }
  });

  useEffect(() => {
    if (!playerName) setPlayerName(localStorage.getItem("playerName") ?? "");
  }, [playerName]);

  const openRooms = availableRooms.data;

  return (<>
    <h2 className="mb-6 text-2xl">Join a game! (tap any room to join)</h2>
    <div
      className="flex flex-col gap-2"
    >
      <input
        type="text"
        placeholder="Your name"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        className="w-full px-4 py-2 text-black rounded-full"
      />
      {!!openRooms && openRooms.length
      ? openRooms.map(room => (
          <button key={room}
            className="px-10 py-3 font-semibold transition rounded-full bg-white/10 hover:bg-white/20"
            disabled={attemptJoin.isLoading}
            onClick={() => {
              if (playerName) {
                attemptJoin.mutate({
                  roomName: room,
                  playerName
                })
              }
            }}
          >
            {(attemptJoin.isLoading && attemptJoin.variables?.roomName === room) ? "Attempting to join..." : `Join ${room}!`}
          </button>
        ))
      : <p>No active games... Create one below!</p>}
    </div>
  </>);
}
