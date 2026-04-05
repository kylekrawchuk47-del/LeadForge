import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import usersRouter from "./users";
import adminRouter from "./admin";
import generateRouter from "./generate";
import contactsRouter from "./contacts";
import emailCampaignsRouter from "./email-campaigns";
import stripeRouter from "./stripe";
import analyticsRouter from "./analytics";
import aiHelpRouter from "./ai-help";
import adsRouter from "./ads";
import socialRouter from "./social";
import referralsRouter from "./referrals";
import adCreatorRouter from "./ad-creator";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(usersRouter);
router.use(adminRouter);
router.use(generateRouter);
router.use(contactsRouter);
router.use(emailCampaignsRouter);
router.use(stripeRouter);
router.use(analyticsRouter);
router.use(aiHelpRouter);
router.use(adsRouter);
router.use(socialRouter);
router.use(referralsRouter);
router.use(adCreatorRouter);

export default router;
