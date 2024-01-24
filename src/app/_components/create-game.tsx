"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "~/trpc/react";

export function CreateGame() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const createGame = api.games.create.useMutation({
    onSuccess: () => {
      router.push(`game/${name}`)
      setName("");
      setPassword("");
    },
  });

  return (<>
    <h2 className="text-2xl mb-6">Create a new room</h2>
    <form
      onSubmit={(e) => {
        e.preventDefault();
        createGame.mutate({ name, password });
      }}
      className="flex flex-col gap-2"
    >
      <input
        type="text"
        placeholder="Room name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-full px-4 py-2 text-black"
      />
      <input
        type="text"
        placeholder="Password (keep it short)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
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
