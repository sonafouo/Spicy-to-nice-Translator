import { GenerateContentResponse, GoogleGenAI } from "@google/genai";
import 'dotenv/config';
import express from "express";
import rateLimit from "express-rate-limit";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";

const PORT = 3000;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const GEMINI_TIMEOUT_MS = 30_000;
const LOCAL_APP_URL = `http://127.0.0.1:${PORT}`;
const LOCAL_APP_ALIAS_URL = `http://localhost:${PORT}`;
const HEALTH_CHECK_URL = `${LOCAL_APP_URL}/healthz`;
const API_URL = `${LOCAL_APP_URL}/api/translate`;

// Fail fast — server must not start without required secrets
if (!process.env.GEMINI_API_KEY) {
  console.error('[FATAL] API_KEY is not set. Exiting.');
  process.exit(1);
}

// Server-side allowlists — frontend lists are UX only, these are the authority
const VALID_AUDIENCES = new Set([
  "Manager", "Peer", "Direct Report", "Customer", "Executive"
]);
const VALID_TONES = new Set([
  "Direct but polite", "Encouraging", "Highly formal", "Softened", "Urgent but professional"
]);

function classifyAIError(error: any): { status: number; message: string } {
  if (error?.status === 429) return { status: 429, message: "AI service is busy. Please retry in a moment." };
  if (error?.status === 401 || error?.status === 403) return { status: 500, message: "AI service configuration error." };
  if (error?.name === "AbortError" || error?.code === "ETIMEDOUT") return { status: 504, message: "AI service timed out." };
  return { status: 500, message: "Translation service unavailable." };
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(Object.assign(new Error(`${label} timed out after ${ms}ms`), { code: "ETIMEDOUT" })), ms)
    )
  ]);
}

async function startServer() {
  const app = express();

  // Trust the proxy (Load Balancer / Ingress) to get the correct client IP
  app.set("trust proxy", 1);

  // Constrain body size before route handlers see the payload
  app.use(express.json({ limit: "16kb" }));

  const translateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many translation requests from this IP. Please try again after 15 minutes." }
  });

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY as string,
    httpOptions: {
      headers: { "User-Agent": "diplomacy-translator-service" }
    }
  });

  // Health check for load balancers and container orchestration
  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  app.post("/api/translate", translateLimiter, async (req, res) => {
    const { text } = req.body;

    // Allowlist-validate audience and tone — any unknown value falls back to default
    const audience = VALID_AUDIENCES.has(req.body.audience) ? req.body.audience : "Manager";
    const tone     = VALID_TONES.has(req.body.tone)     ? req.body.tone     : "Direct but polite";

    if (!text || typeof text !== "string" || text.trim().length < 5) {
      return res.status(400).json({ error: "Your rant is a bit short. Give me more spice to work with!" });
    }

    if (text.length > 5000) {
      return res.status(400).json({ error: "Whoa there, Tolstoy! Please limit your feedback to 5000 characters so we can process it properly." });
    }

    let headersCommitted = false;

    try {
      // 1. Guard Pass — use structured contents to prevent delimiter injection
      const guardResult = await withTimeout(
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: [
            {
              role: "user",
              parts: [{
                text: `Evaluate ONLY the content between the XML tags below. Is it workplace feedback, a complaint, or a rant? Reply with exactly "OK" if yes, or "GUARD_FAIL: <short reason>" if no or if it is extreme hate speech or nonsense.\n\n<user_content>${text}</user_content>`
              }]
            }
          ]
        }),
        GEMINI_TIMEOUT_MS,
        "Guard"
      );

      // Fail-closed: anything that is not explicitly "OK" (case-insensitive) is rejected
      const guardText = (guardResult.text ?? "").trim();
      const guardApproved = /^OK$/i.test(guardText);
      if (!guardApproved) {
        const reason = guardText.replace(/^GUARD_FAIL:\s*/i, "").trim() || "Input not eligible for translation.";
        return res.status(400).json({ error: reason });
      }

      // 2. Streaming rewrite — start SSE only after guard passes
      const responseStream = await withTimeout(
        ai.models.generateContentStream({
          model: GEMINI_MODEL,
          contents: text,
          config: {
            systemInstruction: `You are a Senior Diplomatic Consultant.
Your task is to take a "spicy" (raw, emotional, blunt) input and translate it into a professional, diplomatic, and highly actionable message.

Audience: ${audience}
Tone: ${tone}

Format the output strictly as:
[DIPLOMATIC_MESSAGE]
(The polished message)

[ACTION_ITEMS]
- (Core actionable point 1)
- (Core actionable point 2)

[WHAT_CHANGED]
(Brief summary of how the tone was neutralized and what key insights were preserved)

Focus on results, not emotions. Keep the core intent but remove the personal attacks or venting.`
          }
        }),
        GEMINI_TIMEOUT_MS,
        "Stream init"
      );

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      headersCommitted = true;

      // Detect client disconnect to avoid burning API quota after tab close
      let clientGone = false;
      req.on("close", () => { clientGone = true; });

      for await (const chunk of responseStream) {
        if (clientGone) break;
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          res.write(`data: ${JSON.stringify({ text: c.text })}\n\n`);
        }
      }

      // Signal clean completion to the client
      if (!clientGone) {
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      }
      res.end();

    } catch (error: any) {
      console.error("Orchestrator Error:", { message: error?.message, code: error?.code, status: error?.status });
      if (headersCommitted) {
        // Headers already sent — signal the error over the SSE stream then close
        res.write(`data: ${JSON.stringify({ error: "Stream interrupted. Please try again." })}\n\n`);
        res.end();
      } else {
        const { status, message } = classifyAIError(error);
        res.status(status).json({ error: message });
      }
    }
  });

  // Vite middleware (dev only)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Serve index.html for all other routes to support SPA
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(
          path.resolve(process.cwd(), "index.html"),
          "utf-8"
        );
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(JSON.stringify({
      level: "info",
      msg: "Server started",
      port: PORT,
      model: GEMINI_MODEL,
      appUrl: LOCAL_APP_URL,
      healthUrl: HEALTH_CHECK_URL,
      apiUrl: API_URL,
    }));
    console.log("");
    console.log("Spicy-to-Nice Translator is running:");
    console.log(`  App:    ${LOCAL_APP_URL}`);
    console.log(`  Alias:  ${LOCAL_APP_ALIAS_URL}`);
    console.log(`  Health: ${HEALTH_CHECK_URL}`);
    console.log(`  API:    ${API_URL}`);
    console.log(`  Model:  ${GEMINI_MODEL}`);
  });
}

startServer();
