import path from "node:path";
import { fileURLToPath } from "node:url";

import Bluebird from "bluebird";
import { Router } from "express";
import httpErrors from "http-errors";
import kuromoji, { type Tokenizer, type IpadicFeatures } from "kuromoji";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dicPath = path.resolve(__dirname, "../../../../public/dicts");

let tokenizerPromise: Promise<Tokenizer<IpadicFeatures>> | null = null;

function getTokenizer(): Promise<Tokenizer<IpadicFeatures>> {
  if (!tokenizerPromise) {
    const builder = Bluebird.promisifyAll(kuromoji.builder({ dicPath }));
    tokenizerPromise = builder.buildAsync();
  }
  return tokenizerPromise;
}

let analyzeFn: ((tokens: kuromoji.IpadicFeatures[]) => number) | null = null;

try {
  const mod = await import("negaposi-analyzer-ja");
  analyzeFn = mod.default ?? mod;
} catch {
  analyzeFn = null;
}

export const sentimentRouter = Router();

sentimentRouter.post("/sentiment", async (req, res) => {
  const { text } = req.body;

  if (typeof text !== "string") {
    throw new httpErrors.BadRequest("Missing required field: text");
  }

  if (!analyzeFn) {
    res.json({ score: 0, label: "neutral" });
    return;
  }

  const tokenizer = await getTokenizer();
  const tokens = tokenizer.tokenize(text);
  const score = analyzeFn(tokens);

  let label: "positive" | "negative" | "neutral";
  if (score > 0.1) {
    label = "positive";
  } else if (score < -0.1) {
    label = "negative";
  } else {
    label = "neutral";
  }

  res.json({ score, label });
});
