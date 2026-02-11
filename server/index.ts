import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { startScheduler } from "./scheduler";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Health check endpoint - must be first to respond immediately
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Also respond to root-level health checks (some platforms use this)
app.get("/_health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use(
  express.json({
    limit: '50mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '50mb' }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// Start server immediately, then initialize routes
const port = parseInt(process.env.PORT || "5000", 10);

console.log(`[startup] Starting server on port ${port}...`);
console.log(`[startup] NODE_ENV: ${process.env.NODE_ENV || "development"}`);

// Start listening immediately so health checks pass
httpServer.listen(
  {
    port,
    host: "0.0.0.0",
    reusePort: true,
  },
  () => {
    log(`Server accepting connections on port ${port}`);
    console.log(`[startup] Health check available at /health`);
    
    // Initialize routes after server is listening
    initializeApp().catch((err) => {
      console.error("[startup] Failed to initialize app:", err);
      process.exit(1);
    });
  },
);

async function initializeApp() {
  console.log(`[startup] Initializing routes...`);
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Setup static serving or Vite dev server
  if (process.env.NODE_ENV === "production") {
    console.log(`[startup] Setting up static file serving...`);
    serveStatic(app);
  } else {
    console.log(`[startup] Setting up Vite dev server...`);
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // Start the affirmation scheduler
  console.log(`[startup] Starting affirmation scheduler...`);
  startScheduler();

  console.log(`[startup] Application fully initialized`);
}
