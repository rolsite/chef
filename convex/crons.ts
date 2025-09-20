import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Refresh OpenRouter models every 6 hours
crons.interval("refresh openrouter models", { hours: 6 }, internal.openrouter.refreshModels, {});

export default crons;