import { Router } from "express";
import httpErrors from "http-errors";
import translate from "google-translate-api-x";

export const translateRouter = Router();

translateRouter.post("/translate", async (req, res) => {
  const { text, sourceLanguage, targetLanguage } = req.body;

  if (typeof text !== "string" || typeof sourceLanguage !== "string" || typeof targetLanguage !== "string") {
    throw new httpErrors.BadRequest("Missing required fields: text, sourceLanguage, targetLanguage");
  }

  const result = await translate(text, { from: sourceLanguage, to: targetLanguage });

  res.json({ result: result.text });
});
