import { unstable_noStore as noStore } from "next/cache";
import React from "react";

import { CreateGame } from "@components/create-game";
import { JoinGame } from "@components/join-game";

export default async function Home() {
  noStore();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#bae5ff] to-[#343aae] text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
        <div className="p-8 rounded-xl shadow-inner-lg mb-12">
          <JoinGame />
        </div>
        <div className="p-8 rounded-xl shadow-inner-lg">
          <CreateGame />
        </div>
      </div>
    </main>
  );
}
