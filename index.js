// This is the handler for Lambda.
// Processes on Guild per run.

const Sentry = require("@sentry/serverless");
const GuildIterator = require('./src/GuildIterator.js')
const cronitor = require('cronitor')(process.env.CRONITOR_API_KEY);

Sentry.AWSLambda.init({
  dsn: process.env.SENTRY_URL,
  tracesSampleRate: 1.0
});

exports.handler = Sentry.AWSLambda.wrapHandler(async (event) => {
  const monitor = new cronitor.Monitor(process.env.CRONITOR_MONITOR_ID);
  monitor.ping({state: 'run'});

  const gi = new GuildIterator('manifest.json')
  await gi.fetchManifest()
  await gi.processNextGuild()

  monitor.ping({state: 'complete'});
})
