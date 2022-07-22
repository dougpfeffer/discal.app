/*
Generates an authentication key needed for accessing our .ics files.

Usage:
node generateApiKeyForGuild.js GUILD_ID

Returns the key for this Guild. Give it to the Guild person, they'll communicate to their people that it's required for access.

This assumes a `DISCAL_AUTH_SECRET` has been set in .env, and that should be the same value in the CloudFront auth function.
*/

require('dotenv').config()

const crypto = require('crypto');

const args = process.argv.slice(2);

if(!args[0]){
  console.log('[ERROR] Requires a Guild ID as an argument.')
  process.exit(1);
}

const guildId = args[0].trim().toUpperCase()

console.log(process.env.DISCAL_AUTH_SECRET)

const expectedHash = crypto.createHash('md5').update(process.env.DISCAL_AUTH_SECRET + guildId).digest('base64url')
console.log(expectedHash)