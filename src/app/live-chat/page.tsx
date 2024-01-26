"use client"

import { useCallback, useEffect, useState } from "react";

import { api } from "@_trpc/react"
import { PusherClientProvider, usePusherClient } from "@pusher/react";
import type { MindUser, MindUserId, MindUserPresence } from "@lib/mind";
import { gameChannelName } from "@lib/mind";
import { useMemberTracker } from "@pusher/react/hooks";

const defaultNames = ["Olivia", "Ashleigh", "Emilio", "Ariana", "Belen", "Johnny", "Carolyn", "Lillianna", "Patience", "Lara", "Aniya", "Aleena", "Beau", "Brennen", "Yazmin", "Aubrey", "Luciano", "Kathleen", "Penelope", "Krish", "Kallie", "Branden", "Shirley", "Heidi", "Chaim", "Sydnee", "Trystan", "Madelynn", "Xander", "Marcos", "Hezekiah", "Jimena", "Ruben", "Sarah", "Nataly", "Nick", "Heaven", "Gabriel", "Martin", "Brylee", "Tara", "Randall", "Braelyn", "Adam", "Aisha", "Harrison", "Sylvia", "Jorden", "Jaylee", "Marc", "Reagan", "Ivy", "Lyric", "Memphis", "Alayna", "Reid", "Blaine", "Rubi", "Delilah", "Joel", "Emerson", "Seamus", "Ryan", "Alexandra", "Laila", "Jordyn", "Marvin", "Derrick", "Trey", "Brenda", "Aidyn", "Dwayne", "Jamar", "Trenton", "Yamilet", "Stephany", "Broderick", "Jamarcus", "Renee", "Samson", "Kate", "Edwin", "Averie", "Lilia", "Wade", "Henry", "Molly", "Matteo", "Maurice", "Addison", "Ronald", "Arianna", "Camden", "Tate", "Josiah", "Keely", "Amiya", "Aria", "Garrett", "Atticus"];
export default function Page() {
  const defaultName = defaultNames[Math.floor(Math.random() * defaultNames.length)]!;
  const playerName = typeof window !== "undefined" ? (localStorage.getItem("playerName") ?? defaultName) : defaultName;
  typeof window !== "undefined" && localStorage.setItem("playerName", playerName);
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

  const game_channel_name = gameChannelName(roomName);
  const members = useMemberTracker<MindUser, MindUserId>(game_channel_name, useCallback((member: MindUserPresence) => member, []));

  const postMessage = api.chat.post.useMutation({
    onSuccess: () => {
      setInput("");
    }
  });

  const sendMessage = async (text: string) => {
    postMessage.mutate({ text, mindUser: {roomName, playerName} });
  }

  useEffect(() => {
    const gameChannel_name = gameChannelName(roomName);
    // const gamePresenceChannel_name = presenceChannelName(gameChannel_name);
    const roomChannel = pusherClient.subscribe(gameChannel_name);
    // const presenceChannel = pusherClient.subscribe(gamePresenceChannel_name) as PresenceChannel;

    const handleMessage = (text: string) => {
      console.log(`Got message: |${text}|`);
      setIncomingMessages((prev) => [...prev, text])
    };
    roomChannel.bind('mind:message', handleMessage)

    // const presenceSubscrCb = bindPresenceSubscribed<MindUser, MindUserId>(presenceChannel, ({members}) => {
    //   // console.log(`pusher subscription succeeded`, data);
    //   setMembers(Object.values(members));
    // });
    // const presenceMemAddCb = bindPresenceMemberAdded<MindUser, MindUserId>(presenceChannel, ({info}) => {
    //   // console.log(`pusher subscription succeeded`, data);
    //   setMembers(members => [...members, info]);
    // })
    // const presenceMemRemoveCb = bindPresenceMemberRemoved<MindUser, MindUserId>(presenceChannel, ({id}) => {
    //   // console.log(`pusher subscription succeeded`, data);
    //   setMembers(members => members.filter(member => member.user_id !== id));
    // })
    // console.log(pusherClient);

    return () => {
      roomChannel.unbind('mind:message', handleMessage);
      // unbindPresenceSubscribed(presenceChannel, presenceSubscrCb);
      // unbindPresenceMemberAdded(presenceChannel, presenceMemAddCb);
      // unbindPresenceMemberRemoved(presenceChannel, presenceMemRemoveCb);
      pusherClient.unsubscribe(gameChannel_name);
      // pusherClient.unsubscribe(gamePresenceChannel_name);
    }
  }, [pusherClient, roomName]);

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
        <p key={i}>{`${member.playerName}${member.playerName === playerName ? " (you)" : ""}`}</p>
      ))}
    </div>
  </>)
}