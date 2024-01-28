"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { api } from "@_trpc/react";

export function CreateGame() {
  const router = useRouter();
  const [roomName, setRoomName] = useState("");
  const [hostName, setHostName] = useState("");

  const createGame = api.games.create.useMutation({
    onSuccess: () => {
      localStorage.setItem("playerName", hostName);
      router.push(`game/${roomName}`);
    },
  });

  useEffect(() => {
    if (!hostName) setHostName(localStorage.getItem("playerName") ?? "");
  }, [hostName]);

  return (<>
    <h2 className="text-2xl mb-6">Create a new room</h2>
    <form
      onSubmit={(e) => {
        e.preventDefault();
        createGame.mutate({ roomName, hostName });
      }}
      className="flex flex-col gap-2"
    >
      <input
        type="text"
        placeholder="Room name"
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
        className="w-full rounded-full px-4 py-2 text-black"
      />
      <input
        type="text"
        placeholder="Your name"
        value={hostName}
        onChange={(e) => setHostName(e.target.value)}
        className="w-full rounded-full px-4 py-2 text-black"
      />
      <button
        type="submit"
        className="rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20"
        disabled={createGame.isLoading}
      >
        {createGame.isLoading ? "Setting up game..." : "Launch Room!"}
      </button>
    </form>
  </>);
}
