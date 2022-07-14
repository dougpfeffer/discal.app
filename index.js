// This is the handler for Lambda.
// Processes on Guild per run.

const Sentry = require("@sentry/serverless");
const GuildIterator = require('./src/GuildIterator.js')

Sentry.AWSLambda.init({
  dsn: process.env.SENTRY_URL,
  tracesSampleRate: 1.0
});

exports.handler = Sentry.AWSLambda.wrapHandler(async (event) => {
  const gi = new GuildIterator('manifest.json')
  await gi.fetchManifest()
  await gi.processNextGuild()
})
