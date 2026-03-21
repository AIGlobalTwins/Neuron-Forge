export async function register() {
  // Only run in Node.js runtime (not Edge), and only on the server
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { default: cron } = await import("node-cron");
  const { runPipeline } = await import("./lib/pipeline/run");
  const { initDb } = await import("./lib/db");

  await initDb();

  const hour = process.env.CRON_HOUR ?? "7";
  const query = process.env.DEFAULT_QUERY ?? "restaurantes Lisboa";
  const maxLeads = parseInt(process.env.MAX_LEADS_PER_RUN ?? "50");

  // Schedule daily batch run
  cron.schedule(`0 ${hour} * * *`, async () => {
    console.log(`[Cron] Starting daily batch at ${new Date().toISOString()}`);
    await runPipeline(query, maxLeads);
  });

  console.log(`[Cron] Daily batch scheduled at ${hour}:00`);
}
