"use client"

import { useEffect, useState } from "react";
import type { PresenceChannel } from "pusher-js";

import { api } from "@_trpc/react"
import { PusherClientProvider, bindPresenceMemberAdded, bindPresenceMemberRemoved, bindPresenceSubscribed, unbindPresenceMemberAdded, unbindPresenceMemberRemoved, unbindPresenceSubscribed, usePusherClient } from "@pusher/react";
import { MindUser, MindUserId, MindUserPresence, gameChannelName } from "@lib/mind";
import { presenceChannelName } from "@pusher/shared";


export default function Page() {
  const playerName = typeof window !== "undefined" ? (localStorage.getItem("playerName") ?? "") : "";
  const roomName = "bruh";
  return (
    <PusherClientProvider mindUser={{playerName, roomName}}>
      <Content playerName={playerName} roomName={roomName} />
    </PusherClientProvider>
  )
}

function Content({ playerName, roomName }: MindUser) {
  const pusherClient = usePusherClient();
  const [incomingMessages, setIncomingMessages] = useState<string[]>([])
  const [input, setInput] = useState("");
  const [members, setMembers] = useState<MindUserPresence[]>([]);

  const postMessage = api.games.post.useMutation({
    onSuccess: () => {
      setInput("");
    }
  });

  const sendMessage = async (text: string) => {
    postMessage.mutate({ text, roomName, playerName });
  }

  useEffect(() => {
    const gameChannel_name = gameChannelName(roomName);
    const gamePresenceChannel_name = presenceChannelName(gameChannel_name);
    const roomChannel = pusherClient.subscribe(gameChannel_name);
    const presenceChannel = pusherClient.subscribe(gamePresenceChannel_name) as PresenceChannel;

    const handleMessage = (text: string) => {
      console.log(`Got message: |${text}|`);
      setIncomingMessages((prev) => [...prev, text])
    };

    roomChannel.bind('mind:message', handleMessage)
    const presenceSubscrCb = bindPresenceSubscribed<MindUser, MindUserId>(presenceChannel, ({members}) => {
      // console.log(`pusher subscription succeeded`, data);
      setMembers(Object.values(members));
    });
    const presenceMemAddCb = bindPresenceMemberAdded<MindUser, MindUserId>(presenceChannel, ({info}) => {
      // console.log(`pusher subscription succeeded`, data);
      setMembers(members => [...members, info]);
    })
    const presenceMemRemoveCb = bindPresenceMemberRemoved<MindUser, MindUserId>(presenceChannel, ({id}) => {
      // console.log(`pusher subscription succeeded`, data);
      setMembers(members => members.filter(member => member.user_id !== id));
    })
    console.log(pusherClient);

    return () => {
      roomChannel.unbind('mind:message', handleMessage);
      unbindPresenceSubscribed(presenceChannel, presenceSubscrCb);
      unbindPresenceMemberAdded(presenceChannel, presenceMemAddCb);
      unbindPresenceMemberRemoved(presenceChannel, presenceMemRemoveCb);
      pusherClient.unsubscribe(gameChannel_name);
      pusherClient.unsubscribe(gamePresenceChannel_name);
    }
  }, []);

  return (<>
    <div>
      {incomingMessages.map((text, i) => (
        <p key={i}>{text}</p>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage(input);
        }}
      >
        <input
          onChange={({ target }) => setInput(target.value)}
          placeholder="Message"
          className='border border-zinc-300'
          type='text'
          value={input}
        />
        <button type="submit">send message</button>
      </form>
    </div>
    <div className="mt-10 flex flex-col">
    <h2>Members:</h2>
      {members.map((member, i) => (
        <p key={i}>{member.playerName}</p>
      ))}
    </div>
  </>)
}