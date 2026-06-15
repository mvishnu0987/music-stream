import { Router, type IRouter } from "express";
import healthRouter from "./health";
import musicRouter from "./music";
import playlistsRouter from "./playlists";

const router: IRouter = Router();

router.use(healthRouter);
router.use(musicRouter);
router.use(playlistsRouter);

export default router;
