import { Channel, PresenceChannel } from "pusher-js"

import { useEffect, useRef, useState, useContext, createContext } from "react"
import Pusher from "pusher-js"
import { createStore, StoreApi, useStore } from "zustand"
import { useShallow } from "zustand/react/shallow"
import { env } from "@env"
import useLazyRef from "src/hooks/useLazyRef"

interface PusherProps {
  // channel_slug: string,
  // player_name: string;
}

interface PusherState {
  pusherClient: Pusher;
  reconnect(connectionInitializer: () => Pusher): void;
  propsChanged(newProps: PusherProps): void;

  channels: Record<ChannelID, ChannelInfo>;
  getOrOpenChannel(channelId: ChannelID): ChannelInfo;
  closeChannel(channelId: ChannelID): void;
}
type ChannelProps = {
  room: string;
};
type ChannelID = string;
type ChannelInfo = {
  channelId: ChannelID; // should just be forwarded as channel_slug from props
  channel: Channel;
  presenceChannel: PresenceChannel;
  // members: Record<string, MemberInfo>;
}
type MemberInfo = {
  player_name: string;
}

type PusherStoreApi = StoreApi<PusherState>;

function getConnectedPusherInstance({
  // channel_slug, player_name
}: PusherProps) {
  if (Pusher.instances.length) {
    const client = Pusher.instances[0]!;
    client.connect();
    return client;
  }
  const randomUserId = `random-user-id:${Math.random().toFixed(6)}`;
  // const pusher_user_id = `${channel_slug}-${player_name}`
  
  const pusher = new Pusher(env.NEXT_PUBLIC_PUSHER_KEY, {
    cluster: env.NEXT_PUBLIC_PUSHER_CLUSTER,
    authEndpoint: '/api/pusher/auth-channel',
    auth: {
      headers: { randomUserId },
    },
  });

  console.log(`created new pusher: ${randomUserId}`);
  console.log(pusher);
  return pusher;
}
function channelIdFromProps(channelProps: ChannelProps): ChannelID {
  return channelProps.room;
}

const PusherContext = createContext<PusherStoreApi|null>(null);

export function PusherProvider({children, ...initialPusherProps}: React.PropsWithChildren<PusherProps>) {
  const storeRef = useLazyRef(() => createStore<PusherState>((set, get, state) => ({
    // ...pusherProps,
    reconnect: (connectionInitializer: () => Pusher) => {
      console.log(`Reconnect pusher store`);
      const pusherClient = get().pusherClient;
      pusherClient.disconnect()
      Pusher.instances.splice(0, Pusher.instances.length, ...Pusher.instances.filter(pusherInstance => pusherInstance === pusherClient));
      const channels = get().channels;
      for (let channelId in channels) {
        get().closeChannel(channelId);
      }
      set({
        pusherClient: connectionInitializer(),
      });
    },
    propsChanged: (newProps: PusherProps) => {
      if (Object.is(newProps, initialPusherProps)) return;
      get().reconnect(() => getConnectedPusherInstance(newProps));
      set({
        ...newProps,
      });
    },
    pusherClient: getConnectedPusherInstance(initialPusherProps),
    channels: {},
    getOrOpenChannel: (channelId: ChannelID) => {
      const channels = get().channels;
      let channelInfo = channels[channelId];
      if (channelInfo) return channelInfo;

      const pusherClient = get().pusherClient;
      const channel = pusherClient.subscribe(channelId);
      const presenceChannel = pusherClient.subscribe(
        `presence-${channelId}`
      ) as PresenceChannel;

      channelInfo = {
        channelId,
        channel,
        presenceChannel,
      };
      set({
        channels: {
          [channelId]: channelInfo
        }
      });
      return channelInfo;
    },
    closeChannel: (channelId: ChannelID) => {
      const {
        [channelId]: channel,
        ...otherChannels
      } = get().channels;
      if (!channel) return;

      channel.channel.disconnect();
      channel.presenceChannel.disconnect();
      const pusherClient = get().pusherClient;
      pusherClient.unsubscribe(channelId);
      pusherClient.unsubscribe(`presence-${channelId}`);

      console.log(`Channel closed ${channelId}`);

      set({
        channels: otherChannels
      });
    }
  })));

  useEffect(() => {
    storeRef.current.getState().propsChanged(initialPusherProps);
  }, [initialPusherProps]);

  return (
    <PusherContext.Provider value={storeRef.current}>
      {children}
    </PusherContext.Provider>
  )
}

export function usePusherStore(): PusherState;
export function usePusherStore<T>(
  selector: (state: PusherState) => T,
  // equalityFn?: (a: T, b: T) => boolean
): T;
export function usePusherStore<T>(
  selector?: (state: PusherState) => T,
  // equalityFn?: (a: T, b: T) => boolean
): T {
  const pusherContext = useContext(PusherContext);
  if (!pusherContext) throw new Error("must call usePStore from within PusherContext.Provider!");
  return useStore(
    pusherContext,
    selector as any,
    // equalityFn
  );
}

export function usePusherChannel(channelProps: ChannelProps) {
  const pusherState = usePusherStore();
  const channelId = channelIdFromProps(channelProps);
  let channel = usePusherStore(useShallow(state => state.channels[channelId]));
  if (!channel) channel = pusherState.getOrOpenChannel(channelId);
  // // console.log(pusherState);
  // if (typeof window !== "undefined") (window as any).store = pusherState;
  // const channelId = channelIdFromProps(channelProps);
  // const [channel, setChannel] = useState(pusherState.getOrOpenChannel(channelId));
  // useEffect(() => {
  //   if (channel.channelId !== channelId) {
  //     console.log(`channel changed... ${channel.channelId} -> ${channelId}`)
  //     pusherState.closeChannel(channelId);
  //   }
  //   setChannel(pusherState.getOrOpenChannel(channelId));

  //   return () => {
  //     pusherState.closeChannel(channelId);
  //   }
  // }, [channelProps]);
  return channel;
}

export function usePusherEventSubscribe(channelProps: ChannelProps, eventName: string, callback: Function, context?: any): void {
  const channel = usePusherChannel(channelProps);
  channel.channel.bind(eventName, callback, context);
}

export function usePusherPresenceEventSubscribe(channelProps: ChannelProps, eventName: string, callback: Function, context?: any): void {
  const channel = usePusherChannel(channelProps);
  channel.presenceChannel.bind(eventName, (...args: any[]) => callback(channel.presenceChannel, ...args), context);
}