import type { WebContainer } from '@webcontainer/api';
import { atom } from 'nanostores';
import { createScopedLogger } from '~/utils/logger';
import { withResolvers } from '~/utils/promises';

export interface PreviewInfo {
  port: number;
  ready: boolean;
  baseUrl: string;
}

const PROXY_PORT_RANGE_START = 0xc4ef;

const PROXY_SERVER_SOURCE = `
const http = require('http');

const sourcePort = Number(process.argv[1]);
const targetPort = Number(process.argv[2]);

console.log(\`Starting proxy server: proxying \${targetPort} → \${sourcePort}\`);

const server = http.createServer((req, res) => {
  const proxyReq = http.request(
    {
      hostname: "localhost",
      port: sourcePort,
      path: req.url,
      method: req.method,
      headers: req.headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on("error", (error) => {
    console.error("Proxy error:", error);
    res.writeHead(502);
    res.end("Bad Gateway");
  });

  req.pipe(proxyReq);
});

// Handle WebSocket connections
server.on("upgrade", (req, socket, head) => {
  // Create a socket connection to the target server
  const proxySocket = net.connect(sourcePort, "localhost", () => {
    // Write the HTTP upgrade header to the target
    proxySocket.write(
      \`\${req.method} \${req.url} HTTP/\${req.httpVersion}\r\n\` +
      Object.keys(req.headers).map(key => \`\${key}: \${req.headers[key]}\`).join("\r\n") +
      "\r\n\r\n"
    );
    
    // If there's a head buffer, write it to the target socket
    if (head && head.length) proxySocket.write(head);
    
    // Connect the client and target sockets
    socket.pipe(proxySocket);
    proxySocket.pipe(socket);
  });

  proxySocket.on("error", (err) => {
    console.error("WebSocket proxy error:", err);
    socket.end();
  });

  socket.on("error", (err) => {
    console.error("WebSocket client error:", err);
    proxySocket.end();
  });
});

server.listen(targetPort);
`;

type ProxyState = { sourcePort: number; start: (arg: { proxyUrl: string }) => void; stop: () => void };

export class PreviewsStore {
  #availablePreviews = new Map<number, PreviewInfo>();
  #webcontainer: Promise<WebContainer>;

  previews = atom<PreviewInfo[]>([]);

  #proxies = new Map<number, ProxyState>();

  constructor(webcontainerPromise: Promise<WebContainer>) {
    this.#webcontainer = webcontainerPromise;
    this.#init();
  }

  async #init() {
    const webcontainer = await this.#webcontainer;

    // Listen for server ready events
    webcontainer.on('server-ready', (port, url) => {
      console.log('[Preview] Server ready on port:', port, url);
    });

    // Listen for port events
    webcontainer.on('port', (port, type, url) => {
      if (this.#proxies.has(port)) {
        if (type === 'open') {
          this.#proxies.get(port)?.start({ proxyUrl: url });
        }
        return;
      }

      let previewInfo = this.#availablePreviews.get(port);

      if (type === 'close' && previewInfo) {
        this.#availablePreviews.delete(port);
        this.previews.set(this.previews.get().filter((preview) => preview.port !== port));
        return;
      }

      const previews = this.previews.get();

      if (!previewInfo) {
        previewInfo = { port, ready: type === 'open', baseUrl: url };
        this.#availablePreviews.set(port, previewInfo);
        previews.push(previewInfo);
      }

      previewInfo.ready = type === 'open';
      previewInfo.baseUrl = url;

      this.previews.set([...previews]);
    });
  }

  /**
   * Starts a proxy server for the given source port.
   *
   * Proxy servers are used so that each time a preview is shown on screen,
   * each preview has a different origin. This helps when testing apps with
   * auth with multiple users.
   */
  async startProxy(sourcePort: number): Promise<{ proxyPort: number; proxyUrl: string }> {
    const targetPort = PROXY_PORT_RANGE_START + this.#proxies.size;
    const { promise: onStart, resolve: start } = withResolvers<{ proxyUrl: string }>();

    const proxyLogger = createScopedLogger(`Proxy ${targetPort} → ${sourcePort}`);

    const proxyState: ProxyState = {
      sourcePort,
      start,
      stop() {
        // This should never happen since the external users don’t get access to
        // the ProxyState object before `startProxy` returns (unless they guess
        // the port number)
        throw new Error('Proxy not started');
      },
    };
    this.#proxies.set(targetPort, proxyState);

    // Start the proxy
    const webcontainer = await this.#webcontainer;
    const proxyProcess = await webcontainer.spawn('node', [
      '-e',
      PROXY_SERVER_SOURCE,
      sourcePort.toString(),
      targetPort.toString(),
    ]);

    proxyState.stop = () => {
      proxyLogger.info('Stopping proxy');
      proxyProcess.kill();
    };

    proxyProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          proxyLogger.info(data);
        },
      }),
    );

    const { proxyUrl } = await onStart;
    return { proxyPort: targetPort, proxyUrl };
  }

  /**
   * Called when a proxy server is no longer used and it can be released.
   */
  stopProxy(proxyPort: number) {
    const proxy = this.#proxies.get(proxyPort);
    if (!proxy) {
      throw new Error(`Proxy for port ${proxyPort} not found`);
    }

    proxy.stop();
  }
}
