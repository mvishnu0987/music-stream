import { Router, type IRouter } from "express";
import healthRouter from "./health";
import musicRouter from "./music";
import playlistsRouter from "./playlists";
import favoritesRouter from "./favorites";

const router: IRouter = Router();

router.use(healthRouter);
router.use(musicRouter);
router.use(playlistsRouter);
router.use(favoritesRouter);

export default router;
