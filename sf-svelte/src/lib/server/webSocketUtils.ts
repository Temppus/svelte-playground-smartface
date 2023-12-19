import { parse } from 'url';
import { WebSocketServer } from 'ws';
import { nanoid } from 'nanoid';
import type { Server, WebSocket as WebSocketBase } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';

import ws from 'ws';

import { SubscriptionClient } from 'subscriptions-transport-ws';
import gql from 'graphql-tag';

export const GlobalThisWSS = Symbol.for('sveltekit.wss');

export interface ExtendedWebSocket extends WebSocketBase {
	socketId: string;
	// userId: string;
}

// You can define server-wide functions or class instances here
// export interface ExtendedServer extends Server<ExtendedWebSocket> {};

export type ExtendedWebSocketServer = Server<ExtendedWebSocket>;

export type ExtendedGlobal = typeof globalThis & {
	[GlobalThisWSS]: ExtendedWebSocketServer;
};

export const onHttpServerUpgrade = (req: IncomingMessage, sock: Duplex, head: Buffer) => {
	const pathname = req.url ? parse(req.url).pathname : null;
	if (pathname !== '/websocket') return;

	const wss = (globalThis as ExtendedGlobal)[GlobalThisWSS];

	wss.handleUpgrade(req, sock, head, (ws) => {
		console.log('[handleUpgrade] creating new connecttion');
		wss.emit('connection', ws, req);
	});
};

export const createWSSGlobalInstance = () => {
	const wss = new WebSocketServer({ noServer: true }) as ExtendedWebSocketServer;

	const GRAPHQL_ENDPOINT = 'ws://smartface-demo:8097/graphql';

	const pedeQuery = gql`subscription {
        pedestrianInserted {
          streamId
          frameId
          objectsOnFrameCountForType
        }
      }`;
 
 const wsClient = new SubscriptionClient(GRAPHQL_ENDPOINT, {
    reconnect: true
  }, ws)

  wsClient.request({ query: pedeQuery }).subscribe({
    next(data) {

      console.log('Data received:', data);

      if (wss) {
        wss.clients.forEach(client => {
          if (client.readyState === 1) {
            client.send(JSON.stringify(data));
          }
        });
      }
    },
    error(err) {
      console.error('Error:', err);
    },
    complete() {
      console.log('Subscription complete');
    }
  });

	(globalThis as ExtendedGlobal)[GlobalThisWSS] = wss;

	wss.on('connection', (ws) => {
		ws.socketId = nanoid();
		console.log(`[wss:global] client connected (${ws.socketId})`);

		ws.on('close', () => {
			console.log(`[wss:global] client disconnected (${ws.socketId})`);
		});
	});

	return wss;
};
