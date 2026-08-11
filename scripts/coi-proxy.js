#!/usr/bin/env node
// Local reverse proxy that adds the Cross-Origin-Opener-Policy /
// Cross-Origin-Embedder-Policy response headers `expo start --web` won't apply to
// the "/" document itself.
//
// Why this exists: expo-sqlite's web build (via drizzle-orm/expo-sqlite, whose
// query driver only has a synchronous API — see src/db/client.ts) talks to its
// worker over a SharedArrayBuffer, which browsers only expose in a
// "cross-origin isolated" context. That requires COOP/COEP headers on every
// response, including the HTML page itself. Metro's dev server supports adding
// headers via metro.config.js's `server.enhanceMiddleware` hook, but Expo CLI
// unconditionally prepends its own HTML-serving ManifestMiddleware in front of
// anything registered that way, so a metro.config.js-level fix never reaches the
// "/" response — confirmed by inspecting
// node_modules/expo/node_modules/@expo/cli/build/src/start/server/metro/
// MetroBundlerDevServer.js. A proxy sitting in front of the whole dev server sees
// every request, so it isn't subject to that ordering problem.
//
// Usage:
//   1. In one terminal: npx expo start --web   (leave it running on :8081)
//   2. In another:      node scripts/coi-proxy.js
//   3. Open http://localhost:8082 (not :8081) in the browser.
const http = require('http');
const net = require('net');

const TARGET_PORT = Number(process.env.EXPO_DEV_SERVER_PORT ?? 8081);
const PROXY_PORT = Number(process.env.COI_PROXY_PORT ?? 8082);

const CROSS_ORIGIN_ISOLATION_HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
};

const proxyServer = http.createServer((incomingRequest, serverResponse) => {
  const proxiedRequest = http.request(
    {
      host: '127.0.0.1',
      port: TARGET_PORT,
      method: incomingRequest.method,
      path: incomingRequest.url,
      headers: incomingRequest.headers,
    },
    (targetResponse) => {
      serverResponse.writeHead(targetResponse.statusCode, {
        ...targetResponse.headers,
        ...CROSS_ORIGIN_ISOLATION_HEADERS,
      });
      targetResponse.pipe(serverResponse);
    },
  );
  proxiedRequest.on('error', (error) => {
    serverResponse.writeHead(502);
    serverResponse.end(`coi-proxy: could not reach the Expo dev server on :${TARGET_PORT} (${error.message}). Is "expo start --web" running?`);
  });
  incomingRequest.pipe(proxiedRequest);
});

// Metro's HMR / dev-tools websocket connections need a raw pass-through, not the
// header-rewriting HTTP path above.
proxyServer.on('upgrade', (incomingRequest, clientSocket, headBuffer) => {
  const targetSocket = net.connect(TARGET_PORT, '127.0.0.1', () => {
    const requestLine = `${incomingRequest.method} ${incomingRequest.url} HTTP/${incomingRequest.httpVersion}\r\n`;
    const headerLines = Object.entries(incomingRequest.headers)
      .map(([headerName, headerValue]) => `${headerName}: ${headerValue}`)
      .join('\r\n');
    targetSocket.write(`${requestLine}${headerLines}\r\n\r\n`);
    if (headBuffer?.length) targetSocket.write(headBuffer);
    targetSocket.pipe(clientSocket);
    clientSocket.pipe(targetSocket);
  });
  targetSocket.on('error', () => clientSocket.destroy());
});

proxyServer.listen(PROXY_PORT, () => {
  console.log(
    `coi-proxy ready — open http://localhost:${PROXY_PORT} (proxying the Expo dev server on :${TARGET_PORT})`,
  );
});
