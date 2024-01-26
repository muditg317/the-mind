"use client"

import { pusherClient } from "@lib/pusher/client";
import { useEffect, useState } from "react";

export default function Page() {
    const roomId = "bruh";
    const [incomingMessages, setIncomingMessages] = useState<string[]>([])
    const [input, setInput] = useState("");

    const sendMessage = async (text: string) => {
        await fetch("/api/pusher/post", {
            method: "POST", // *GET, POST, PUT, DELETE, etc.
            mode: "cors", // no-cors, *cors, same-origin
            cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
            credentials: "same-origin", // include, *same-origin, omit
            headers: {
              "Content-Type": "application/json",
              // 'Content-Type': 'application/x-www-form-urlencoded',
            },
            redirect: "follow", // manual, *follow, error
            referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
            body: JSON.stringify({
                text,
                roomId
            }), // body data type must match "Content-Type" header
        });
        setInput("");
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
                    sendMessage(input);
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