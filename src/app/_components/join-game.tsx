"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";

import { api } from "~/trpc/react";

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
// } from "~/app/_components/ui/alert-dialog"
// import { Button } from "~/app/_components/ui/button"

interface JoinGameProps {
  existingRooms: string[];
}
export function JoinGame({ existingRooms }: JoinGameProps) {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const attemptJoin = api.games.attemptJoin.useMutation({
    onSuccess: ({roomName,playerName}) => {
      localStorage.setItem("playerName", playerName);
      router.push(`game/${roomName}`);
    }
  });

  return (<>
    <h2 className="text-2xl mb-6">Join a game! (tap any room to join)</h2>
    <div
      className="flex flex-col gap-2"
    >
      <input
        type="text"
        placeholder="Your name"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        className="w-full rounded-full px-4 py-2 text-black"
      />
      {!!existingRooms && existingRooms.length
      ? existingRooms.map(room => <React.Fragment key={room}>
          <button
            className="rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20"
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
            {attemptJoin.isLoading ? "Attempting to join..." : `Join ${room}!`}
          </button>
        </React.Fragment>)
      : <p>No active games... Create one below!</p>}
    </div>
  </>);
}
