import bodyParser from "body-parser";
import Express from "express";

import { apiRouter } from "@web-speed-hackathon-2026/server/src/routes/api";
import { imageOptimizerRouter } from "@web-speed-hackathon-2026/server/src/routes/image_optimizer";
import { staticRouter } from "@web-speed-hackathon-2026/server/src/routes/static";
import { sessionMiddleware } from "@web-speed-hackathon-2026/server/src/session";

export const app = Express();

app.set("trust proxy", true);

app.use(sessionMiddleware);
app.use(bodyParser.json());
app.use(bodyParser.raw({ limit: "10mb" }));

app.use((_req, res, next) => {
  // Allow long-lived caching for static image/movie/sound assets
  if (/^\/(images|movies|sounds)\//.test(_req.path)) {
    res.header({
      "Cache-Control": "public, max-age=86400",
    });
  } else {
    res.header({
      "Cache-Control": "max-age=0, no-transform",
      Connection: "close",
    });
  }
  return next();
});

app.use("/api/v1", apiRouter);
app.use(imageOptimizerRouter);
app.use(staticRouter);
