"use client"

import { pusherClient } from "@lib/pusher/client";
import { useEffect, useState } from "react";

import { api } from "@_trpc/react"

export default function Page() {
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
        pusherClient.subscribe(roomId)

        const handleMessage = (text: string) => {
            console.log(`Got message: |${text}|`);
            setIncomingMessages((prev) => [...prev, text])
        };

        pusherClient.bind('message', handleMessage)

        return () => {
            pusherClient.unbind('message', handleMessage);
            pusherClient.unsubscribe(roomId);
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