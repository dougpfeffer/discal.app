// This is the handler for Lambda.
// Processes on Guild per run.

const GuildIterator = require('./src/GuildIterator.js')

exports.handler = async (event) => {
  const gi = new GuildIterator('manifest.json')
  await gi.fetchManifest()
  await gi.processNextGuild()
}
