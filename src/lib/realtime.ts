import { RealtimeChannel } from '@supabase/supabase-js'

import { isSupabaseConfigured, supabase } from './supabase'

type RealtimeHandler<T> = (payload: T, rawEvent: any) => void

interface SubscribeOptions {
  schema?: string
  filter?: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  channelName?: string
}

/**
 * Suscribe a eventos en tiempo real de una tabla.
 *
 * Útil para dashboards que requieren sincronización sin polling masivo.
 * Devuelve una función de cleanup para desuscribirse.
 */
export function subscribeToTable<T = unknown>(
  table: string,
  handler: RealtimeHandler<T>,
  options: SubscribeOptions = {},
): () => void {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase no está configurado, omitiendo suscripción en tiempo real')
    return () => {}
  }

  const { schema = 'public', filter, event = '*', channelName } = options

  const channel: RealtimeChannel = supabase.channel(
    channelName || `realtime-${schema}-${table}`,
    {
      config: {
        broadcast: { ack: true },
      },
    },
  )

  channel
    .on(
      'postgres_changes',
      {
        schema,
        table,
        event,
        filter,
      },
      (payload) => {
        handler(payload.new as T, payload)
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Helper para difundir un mensaje custom entre clientes conectados a un canal.
 * Permite escalar funcionalidades colaborativas sin montar un backend adicional.
 */
export function broadcastMessage<T = unknown>(channelName: string, event: string, payload: T) {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase no está configurado, omitiendo broadcast')
    return
  }

  const channel = supabase.channel(channelName, {
    config: {
      broadcast: { ack: true },
    },
  })

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      channel.send({ type: 'broadcast', event, payload })
    }
  })
}
