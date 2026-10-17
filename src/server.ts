import * as http from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

export interface DisplayExplanation {
  filename: string;
  start: number;
  end: number;
  text: string;
}

export class ExplanationServer {
  private server: http.Server | undefined;
  private clients = new Set<http.ServerResponse>();
  private current: DisplayExplanation | undefined;
  private address: string | undefined;
  get url(): string | undefined { return this.address; }

  async start(webDirectory: string): Promise<string> {
    if (this.address) { return this.address; }
    const base = `/${randomBytes(24).toString('hex')}/`;
    const assets = new Map([
      ['', { type: 'text/html; charset=utf-8', body: readFileSync(path.join(webDirectory, 'index.html')) }],
      ['style.css', { type: 'text/css; charset=utf-8', body: readFileSync(path.join(webDirectory, 'style.css')) }],
      ['app.js', { type: 'text/javascript; charset=utf-8', body: readFileSync(path.join(webDirectory, 'app.js')) }]
    ]);
    const server = http.createServer((request, response) => {
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.setHeader('Referrer-Policy', 'no-referrer');
      response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'");
      const origin = this.address ? new URL(this.address).origin : '';
      if (request.method !== 'GET' || request.headers.host !== origin.slice(7) ||
          (request.headers.origin && request.headers.origin !== origin)) {
        response.writeHead(403).end();
        return;
      }
      if (request.url === `${base}events`) {
        response.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Connection': 'keep-alive' });
        response.flushHeaders();
        response.write('retry: 1000\n\n');
        this.clients.add(response);
        if (this.current) { this.send(response, 'explanation', this.current); }
        request.on('close', () => this.clients.delete(response));
        response.on('error', () => { this.clients.delete(response); response.destroy(); });
        return;
      }
      const asset = request.url?.startsWith(base) ? assets.get(request.url.slice(base.length)) : undefined;
      if (!asset) { response.writeHead(404).end(); return; }
      response.writeHead(200, { 'Content-Type': asset.type }).end(asset.body);
    });
    this.server = server;
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); });
      });
    } catch (error) { this.server = undefined; throw error; }
    const address = server.address();
    if (!address || typeof address === 'string') { throw new Error('No local server address'); }
    this.address = `http://127.0.0.1:${address.port}${base}`;
    return this.address;
  }

  publish(explanation: DisplayExplanation): void {
    if (JSON.stringify(this.current) === JSON.stringify(explanation)) { return; }
    this.current = explanation;
    for (const client of this.clients) { this.send(client, 'explanation', explanation); }
  }

  private send(client: http.ServerResponse, event: string, data: unknown): void {
    // JSON is only the SSE wire format; explanation files are always plain text.
    if (!client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)) {
      this.clients.delete(client);
      client.destroy(); // A slow/disconnected browser reconnects and receives the latest snapshot.
    }
  }

  async stop(): Promise<void> {
    const server = this.server;
    this.server = undefined;
    this.address = undefined;
    for (const client of this.clients) {
      client.end('event: stopped\ndata: {}\n\n');
    }
    this.clients.clear();
    this.current = undefined;
    if (server) {
      await new Promise<void>(resolve => {
        server.close(() => resolve());
        server.closeAllConnections();
      });
    }
  }
}
