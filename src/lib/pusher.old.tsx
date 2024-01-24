import type { Channel, PresenceChannel } from "pusher-js"

import { useEffect, useRef, useState, useContext, createContext } from "react"
import Pusher from "pusher-js"
import { createStore } from "zustand"
import { useStoreWithEqualityFn } from "zustand/traditional"
import { env } from "@env"

interface PusherProps {
  channel_slug: string,
  player_name: string;
}

interface PusherState {
  pusherClient: Pusher
  channel: Channel
  presenceChannel: PresenceChannel
  members: Map<string, unknown>
}

function getConnectedPusherInstance({ channel_slug, player_name }: PusherProps) {
  if (Pusher.instances.length) {
    const client = Pusher.instances[0]!;
    client.connect();
    return client;
  }
  // const randomUserId = `random-user-id:${Math.random().toFixed(6)}`
  const pusher_user_id = `${channel_slug}-${player_name}`
  return new Pusher(env.NEXT_PUBLIC_PUSHER_KEY, {
    cluster: env.NEXT_PUBLIC_PUSHER_CLUSTER,
    authEndpoint: '/api/pusher/auth-channel',
    auth: {
      headers: { pusher_user_id },
    },
  })
  // return new Pusher(pusher_key, {
  //   wsHost: pusher_server_host,
  //   wsPort: pusher_server_port,
  //   enabledTransports: pusher_server_tls ? ['ws', 'wss'] : ['ws'],
  //   forceTLS: pusher_server_tls,
  //   cluster: pusher_server_cluster,
  //   disableStats: true,
  //   authEndpoint: '/api/pusher/auth-channel',
  //   auth: {
  //     headers: { player_name: randomUserId },
  //   },
  // })
}

const createPusherStore = (pusher_props: PusherProps) => {
  const pusherClient = getConnectedPusherInstance(pusher_props);
  const { channel_slug } = pusher_props;

  const channel = pusherClient.subscribe(channel_slug)

  const presenceChannel = pusherClient.subscribe(
    `presence-${channel_slug}`
  ) as PresenceChannel

  const store = createStore<PusherState>(() => {
    return {
      pusherClient,
      channel,
      presenceChannel,
      members: new Map(),
    }
  })

  // Update helper that sets 'members' to contents of presence channel's current members
  const updateMembers = (members: PresenceChannel["members"]) => {
    store.setState(() => ({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      members: new Map(Object.entries(members.members)),
    }))
  }

  // Bind all "present users changed" events to trigger updateMembers
  presenceChannel.bind('pusher:subscription_succeeded', updateMembers)
  // presenceChannel.bind('pusher:member_added', updateMembers)
  // presenceChannel.bind('pusher:member_removed', updateMembers)

  return store
}

/**
 * Section 2: "The Context Provider"
 *
 */
type PusherStore = ReturnType<typeof createPusherStore>
export const PusherContext = createContext<PusherStore | null>(null)

/**
 * This provider is the thing you mount in the app to "give access to Pusher"
 *
 */
type PusherProviderProps = React.PropsWithChildren<PusherProps>

export const PusherProvider = ({ channel_slug, children }: PusherProviderProps) => {
  const [store, setStore] = useState<PusherStore>()

  useEffect(() => {
    const newStore = createPusherStore({ channel_slug })
    setStore(newStore)
    console.log("made new pusher", newStore)
    return () => {
      const pusher = newStore.getState().pusherClient
      console.log('disconnecting pusher:', pusher)
      console.log(
        '(Expect a warning in terminal after this, React Dev Mode and all)'
      )
      pusher.disconnect()
    }
  }, [channel_slug])

  if (!store) return null;

  return (
    <PusherContext.Provider value={store}>{children}</PusherContext.Provider>
  );
}

/**
 * Section 3: "The Hooks"
 *
 * The exported hooks you use to interact with this store (in this case just an event sub)
 *
 * (I really want useEvent tbh)
 */
function usePusherStore<T>(
  selector: (state: PusherState) => T,
  equalityFn?: (left: T, right: T) => boolean
): T {
  const store = useContext(PusherContext)
  if (!store) throw new Error('Missing PusherContext.Provider in the tree')
  return useStoreWithEqualityFn(store, selector, equalityFn);
  // return useStore(store, selector, equalityFn)
}

export function useSubscribeToEvent<MessageType>(
  eventName: string,
  callback: (data: MessageType) => void
) {
  const channel = usePusherStore(state => state.channel)

  const stableCallback = useRef(callback)

  // Keep callback sync'd
  useEffect(() => {
    stableCallback.current = callback
  }, [callback])

  useEffect(() => {
    const reference = (data: MessageType) => {
      stableCallback.current(data)
    }
    channel.bind(eventName, reference)
    return () => {
      channel.unbind(eventName, reference)
    }
  }, [channel, eventName])
}

export const useCurrentMemberCount = () => usePusherStore(s => s.members.size)