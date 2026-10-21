import React, { useEffect, useState } from 'react';
import { useI18n } from '../useI18n';
import type { MessageKey } from '../messages';

const USER_ID = '772232490445176842';
const SOCKET_URL = 'wss://api.lanyard.rest/socket';

type Status = 'online' | 'idle' | 'dnd' | 'offline';

interface Activity {
  type: number;
  name: string;
  details?: string;
  state?: string;
}

interface Spotify {
  song: string;
  artist: string;
  album_art_url: string;
}

interface Presence {
  discord_status: Status;
  discord_user: { username: string; display_name?: string; avatar: string | null };
  activities: Activity[];
  listening_to_spotify: boolean;
  spotify: Spotify | null;
}

const STATUS_COLOR: Record<Status, string> = {
  online: 'bg-white',
  idle: 'bg-white/50',
  dnd: 'bg-white/30',
  offline: 'bg-white/15',
};

const ACTIVITY_KEY: Record<number, MessageKey> = {
  0: 'presence.playing',
  1: 'presence.streaming',
  2: 'presence.listening',
  3: 'presence.watching',
};

function avatarUrl(user: Presence['discord_user']): string {
  if (!user.avatar) return `https://cdn.discordapp.com/embed/avatars/0.png`;
  return `https://cdn.discordapp.com/avatars/${USER_ID}/${user.avatar}.png?size=128`;
}

export const PresenceCard: React.FC = () => {
  const { t } = useI18n();
  const [presence, setPresence] = useState<Presence | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let closed = false;

    const connect = () => {
      socket = new WebSocket(SOCKET_URL);

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data) as { op: number; d: { heartbeat_interval?: number } };
        if (message.op === 1) {
          const interval = message.d.heartbeat_interval ?? 30000;
          socket?.send(JSON.stringify({ op: 2, d: { subscribe_to_id: USER_ID } }));
          heartbeat = setInterval(() => socket?.readyState === WebSocket.OPEN && socket.send(JSON.stringify({ op: 3 })), interval);
        } else if (message.op === 0) {
          setPresence(message.d as unknown as Presence);
        }
      };

      socket.onerror = () => setFailed(true);
      socket.onclose = () => {
        if (heartbeat) clearInterval(heartbeat);
        if (!closed) setTimeout(connect, 4000);
      };
    };

    connect();
    return () => {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      socket?.close();
    };
  }, []);

  const status = presence?.discord_status ?? 'offline';
  const spotify = presence?.listening_to_spotify ? presence.spotify : null;
  const activity = presence?.activities.find((item) => item.type !== 2 && item.type !== 4);
  const name = presence?.discord_user.display_name || presence?.discord_user.username;

  return (
    <section className="pb-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md">
          <p className="mb-4 text-center font-mono text-[11px] uppercase tracking-[0.28em] text-subtext">
            {t('presence.eyebrow')}
          </p>

          <div className="rounded-2xl border border-white/10 bg-card p-4">
            {!presence && !failed && <p className="py-6 text-center text-sm text-subtext">{t('presence.loading')}</p>}
            {failed && !presence && (
              <p className="py-6 text-center text-sm text-subtext">{t('presence.unavailable')}</p>
            )}

            {presence && (
              <div className="flex items-center gap-3">
                <span className="relative shrink-0">
                  <img src={avatarUrl(presence.discord_user)} alt="" className="h-12 w-12 rounded-full" />
                  <span
                    className={`absolute right-0 bottom-0 h-3.5 w-3.5 rounded-full border-2 border-card ${STATUS_COLOR[status]}`}
                  />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-white">{name}</span>
                  <span className="block text-xs text-subtext">{t(`presence.${status}`)}</span>
                </span>
              </div>
            )}

            {spotify && (
              <div className="mt-4 flex items-center gap-3 border-t border-white/10 pt-4">
                <img src={spotify.album_art_url} alt="" className="h-12 w-12 rounded-lg grayscale" />
                <span className="min-w-0">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-subtext">
                    {t('presence.listening')}
                  </span>
                  <span className="block truncate text-sm text-white">{spotify.song}</span>
                  <span className="block truncate text-xs text-subtext">{spotify.artist}</span>
                </span>
                <Equalizer />
              </div>
            )}

            {activity && (
              <div className="mt-4 border-t border-white/10 pt-4">
                <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-subtext">
                  {t(ACTIVITY_KEY[activity.type] ?? 'presence.playing')}
                </span>
                <span className="mt-1 block truncate text-sm text-white">{activity.name}</span>
                {activity.details && <span className="block truncate text-xs text-subtext">{activity.details}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

const Equalizer: React.FC = () => (
  <span className="ml-auto flex h-4 items-end gap-0.5" aria-hidden="true">
    {[0, 1, 2, 3].map((bar) => (
      <span
        key={bar}
        className="w-0.5 origin-bottom bg-white/70"
        style={{ height: '100%', animation: `eq 1.1s ${bar * 0.15}s ease-in-out infinite` }}
      />
    ))}
  </span>
);
