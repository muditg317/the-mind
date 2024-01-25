"use client"

import { useEffect, useState } from "react";
import type { PresenceChannel } from "pusher-js";

import { pusherClient } from "@lib/pusher/client";
import { api } from "@_trpc/react"



export default function Page() {
    // const playerName = typeof window !== "undefined" ? (localStorage.getItem("playerName") ?? "") : "";
    const roomId = "bruh";
    const [incomingMessages, setIncomingMessages] = useState<string[]>([])
    const [input, setInput] = useState("");

    const postMessage = api.games.post.useMutation({
        onSuccess: () => {
            setInput("");
        }
    });

    const sendMessage = async (text: string) => {
        postMessage.mutate({ text, roomId });
    }

    useEffect(() => {
        const roomChannel = pusherClient.subscribe(roomId);
        const presenceChannel = pusherClient.subscribe(`presence-${roomId}`) as PresenceChannel;

        const handleMessage = (text: string) => {
            console.log(`Got message: |${text}|`);
            setIncomingMessages((prev) => [...prev, text])
        };

        roomChannel.bind('message', handleMessage)
        // presenceChannel.bind('pusher:subscription_succeeded', (data: unknown) => {
        //     console.log(`pusher subscription succeeded`, data);
        // });
        presenceChannel.bind('pusher:member_added', (data: unknown) => {
            console.log(`pusher member added`, data);
        });
        console.log(pusherClient);

        return () => {
            pusherClient.unbind('message', handleMessage);
            pusherClient.unsubscribe(roomId);
            pusherClient.subscribe(`presence-${roomId}`);
        }
    }, []);

    return (
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
      )
}