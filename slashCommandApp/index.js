// This Lambda responds to the /discal global slash command in Discord.
// It does two things:
// 1. It responds appropriately to the initial Discord bot onboarding process
// 2. Assumimng that's done, it actually returns the appropriate message to the initiating user in Discord.

const nacl = require('tweetnacl');
const bodyParser = require('body-parser')
var crypto = require('crypto');

// We've symlinked the project's .env to a file in this specific directory, so it can be deployed with the Lambda.
require('dotenv').config();

exports.handler = async (event, context, callback) => {

  console.log(event)

  if(event.headers['x-signature-ed25519']) {
    // https://discord.com/developers/docs/interactions/receiving-and-responding#security-and-authorization
    const signature = event.headers['x-signature-ed25519'];
    const timestamp = event.headers['x-signature-timestamp'];
    const body = event.body;

    const parsedBody = JSON.parse(event.body)

    console.log(signature, timestamp, body)

    const isVerified = nacl.sign.detached.verify(
      Buffer.from(timestamp + body),
      Buffer.from(signature, 'hex'),
      Buffer.from(process.env.DISCORD_CLIENT_PUBLIC_KEY, 'hex')
      );

    if (!isVerified) {
      return {
        statusCode: 401
      };
    } else {
      if(parsedBody['type'] == 1){
        // https://discord.com/developers/docs/interactions/receiving-and-responding#responding-to-an-interaction
        // "Your endpoint must be prepared to ACK a PING message"        
        return {
          statusCode: 200,
          body: JSON.stringify({"type": 1}),
        };        
      } else if(parsedBody['type'] == 2){

        const guildId = parsedBody['guild_id']
        const userId = parsedBody['member']['user']['id']

        const key = crypto.createHash('md5').update(process.env.DISCAL_AUTH_SECRET + guildId).digest('base64url')

        // Need to generate the simple hash.

        const message = `Hello ${parsedBody.member.user.username}!\n
You can subscribe to all of this group's events with the following URL:

\`https://api.discal.app/guilds/${guildId}/events.ics?key=${key}\`

Or, subscribe to only the events you are interested in, via:

\`https://api.discal.app/guilds/${guildId}/users/${userId}/events.ics?key=${key}\`

Be sure to "import" your feed into your calendar app, don't just download the file and open it.

These URLs should not be shared.

For more information, please visit https://discal.app/.`

        const response = {
          type: 4,
          data: {
            tts: false,
            content: message,
            flags: 1 << 6 // Ephehmeral
          }
        }

        return {
          statusCode: 200,
          body: JSON.stringify(response),
        };

      }
    }
  } else {
    return {
      statusCode: 500
    };
  }
}
