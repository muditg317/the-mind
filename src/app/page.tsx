import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import React from "react";

import { CreateGame } from "~/app/_components/create-game";
import { api } from "~/trpc/server";

export default async function Home() {
  noStore();
  const existingGames = await api.games.getAll.query();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#bae5ff] to-[#343aae] text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
        {/* <div className="p-8 rounded-xl inset-2 border-black border-solid border-2"> */}
        <div className="p-8 rounded-xl shadow-inner-lg mb-12">
          <h2 className="text-2xl">Join a game! (tap any room to join)</h2>
          {!!existingGames && existingGames.length
            ? existingGames.map(game => <React.Fragment key={game.name}>
              <p>{game.name}</p>
            </React.Fragment>)
            : <p>No active games... Create one below!</p>
          }
        </div>
        <div className="p-8 rounded-xl shadow-inner-lg">
          <CreateGame />
        </div>
      </div>
    </main>
  );
}
