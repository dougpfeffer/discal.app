// Simple demo of running the script outside of Lambda, for local dev purposes for example.


const GuildIterator = require('./src/GuildIterator.js')

const main = async function(){
  const gi = new GuildIterator('manifest.json')
  await gi.fetchManifest()
  await gi.processNextGuild()
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });