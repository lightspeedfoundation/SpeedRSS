import { config } from "dotenv";
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";

import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { submitRouter } from "./routes/submit.js";
import { feedRouter } from "./routes/feed.js";
import { healthRouter } from "./routes/health.js";

config();

const skipPayment = process.env.SKIP_PAYMENT?.toLowerCase() === "true";
const payTo = process.env.PAY_TO as `0x${string}` | undefined;
const facilitatorUrl = process.env.FACILITATOR_URL;
const port = Number(process.env.PORT) || 4021;

if (!skipPayment) {
  if (!payTo) {
    console.error("Missing PAY_TO environment variable (EVM wallet address)");
    process.exit(1);
  }
  if (!facilitatorUrl) {
    console.error("Missing FACILITATOR_URL environment variable");
    process.exit(1);
  }
}

const facilitatorClient =
  facilitatorUrl != null ? new HTTPFacilitatorClient({ url: facilitatorUrl }) : null;
const server =
  facilitatorClient != null
    ? new x402ResourceServer(facilitatorClient).register("eip155:84532", new ExactEvmScheme())
    : null;

const app = express();
app.use(express.json());

if (!skipPayment && server != null) {
  app.use(
    paymentMiddleware(
      {
        "POST /submit": {
          accepts: [
            {
              scheme: "exact",
              price: "$0.25",
              network: "eip155:84532",
              payTo: payTo!,
            },
          ],
          description: "Submit an X post URL to SpeedRSS feed",
          mimeType: "application/json",
        },
      },
      server,
    ),
  );
}

app.use("/", submitRouter);
app.use("/", feedRouter);
app.use("/", healthRouter);

const __dirname = dirname(fileURLToPath(import.meta.url));
const widgetPath = join(__dirname, "..", "widget");
app.use("/widget", express.static(widgetPath));
app.get("/widget", (_req, res) => res.sendFile(join(widgetPath, "index.html")));

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
