import http from "http";
import crypto from "crypto";
import { shell } from "electron";
import type { UserConfig } from "../../types";

const FRONTEND_URL =
  process.env["DATALENS_FRONTEND_URL"] ?? "https://datalens-eosin.vercel.app";

export async function startAuthFlow(): Promise<UserConfig> {
  const state = crypto.randomBytes(16).toString("hex");

  return new Promise<UserConfig>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      // Allow the Vercel page (HTTPS) to fetch this local HTTP server
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

      if (req.method === "OPTIONS") {
        res.writeHead(204); res.end(); return;
      }

      try {
        const url = new URL(req.url!, "http://127.0.0.1");
        if (url.pathname !== "/callback") {
          res.writeHead(404); res.end(); return;
        }

        const receivedState = url.searchParams.get("state");
        const token = url.searchParams.get("token");

        if (receivedState !== state || !token) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end("<html><body><h2>Invalid request. Please try again.</h2></body></html>");
          server.close();
          reject(new Error("Auth failed: bad state or missing token"));
          return;
        }

        // Fetch all API keys from the backend using the Clerk token
        const configRes = await fetch(`${FRONTEND_URL}/api/config`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!configRes.ok) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end("<html><body><h2>Sign-in failed. Please try again.</h2></body></html>");
          server.close();
          reject(new Error(`Config fetch failed: ${configRes.status}`));
          return;
        }

        const config = (await configRes.json()) as UserConfig;

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <html>
            <body style="font-family:system-ui;background:#0f0f13;color:#e0e0e0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
              <div style="text-align:center">
                <h2 style="color:#4caf50">Signed in!</h2>
                <p>You can close this window and return to DataLens.</p>
              </div>
            </body>
          </html>
        `);
        server.close();
        resolve({ ...config, frontendUrl: FRONTEND_URL });

      } catch (err) {
        res.writeHead(500); res.end();
        server.close();
        reject(err);
      }
    });

    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as { port: number }).port;
      const authUrl = `${FRONTEND_URL}/desktop-auth?port=${port}&state=${state}`;
      shell.openExternal(authUrl);
    });

    // 3-minute timeout
    setTimeout(() => {
      server.close();
      reject(new Error("Auth timed out — please try again"));
    }, 180_000);
  });
}
