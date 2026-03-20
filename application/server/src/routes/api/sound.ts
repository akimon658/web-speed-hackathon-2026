import { execFile } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

import { Router } from "express";
import httpErrors from "http-errors";
import { v4 as uuidv4 } from "uuid";

import { UPLOAD_PATH } from "@web-speed-hackathon-2026/server/src/paths";
import { extractMetadataFromSound } from "@web-speed-hackathon-2026/server/src/utils/extract_metadata_from_sound";

const execFileAsync = promisify(execFile);

// 変換した音声の拡張子
const EXTENSION = "mp3";

export const soundRouter = Router();

soundRouter.post("/sounds", async (req, res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }
  if (Buffer.isBuffer(req.body) === false) {
    throw new httpErrors.BadRequest();
  }

  const soundId = uuidv4();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "sound-"));
  const tmpInput = path.join(tmpDir, "input");
  const tmpOutput = path.join(tmpDir, `output.${EXTENSION}`);

  try {
    await fs.writeFile(tmpInput, req.body);

    await execFileAsync("ffmpeg", ["-i", tmpInput, "-vn", "-y", tmpOutput]);

    const converted = await fs.readFile(tmpOutput);

    const { artist, title } = await extractMetadataFromSound(converted);

    const filePath = path.resolve(UPLOAD_PATH, `./sounds/${soundId}.${EXTENSION}`);
    await fs.mkdir(path.resolve(UPLOAD_PATH, "sounds"), { recursive: true });
    await fs.writeFile(filePath, converted);

    return res.status(200).type("application/json").send({ artist, id: soundId, title });
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
