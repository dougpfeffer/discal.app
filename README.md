# A Discord Events calendar generator.

This creates .ICS files for Discord events.

Two types of calendar files are generated:
- A top level .ICS which contains all events for a Discord.
- Individual calendar files for each participating user, allowing someone to subscribe to a feed of only the events they're "interested" in.

## Configuration

A few files are expected to exsit for this to function:

An .env files containing the following:
- A Discord Bot Client Token (`CLIENT_TOKEN`)
- The S3 bucket that will store the .ICS files (`S3_BUCKET_NAME`)
- AWS creds for a user that can read/write to that bucket. (`AWS_ACCESS_KEY` and `AWS_ACCESS_SECRET`)
- Sentry (https://sentry.io) config (`SENTRY_URL`). This is required for the Lambda handler, but not used anywhere else.
- Cronitor (https://cronitor.io) API Key (`CRONITOR_API_KEY`). This is required for the Lambda handler, but not used anywhere else.
- Cronitor monitor ID (`CRONITOR_MONITOR_ID`)
- "Secret" for authentication (`DISCAL_AUTH_SECRET`). More on authentication below.
- Discord Bot Public Key (`DISCORD_CLIENT_PUBLIC_KEY`) for use with the slash command (`/discal`)

A `manifest.json` file (in the root of the S3 bucket) that lists Guilds we're working with. It should look like so:

```
[
  {"id": "890053994926460939", "name": "Def"}
]
```

The "name" field is used in the text of the calendar files only, the exact value doesn't matter.

## Operation

This script runs in the context of an AWS Lambda, and writes to an S3 Bucket defined in .env as S3_BUCKET_NAME.

Most likely this will be scheduled to run periodically, which can be done with AWS EventBridge.

Only one Guild is processed at a time. The theory is we'll loop over them all forever, keepign them all in sync. We process them in the order of how 'old' each process attempt is.

The calendar files are written to directories named after their Guild IDs, like so:

`/guilds/<guild id>/events.ics?key=xxx`

`/guilds/<guild id>/users/<user id>/events.ics?key=xxx`

A template of a simple deploy Bash script is available. Rename it from `deploy.sh.template` to `deploy.sh`, make it executable (`chmod +x`) and swap in real values.

## Authentication

We provide a light authentication layer to keep away total randoms from guessing calendar feed URLS. 

This is faciliated by a CloudFront Function, which checks for a `?key` parameter in any request. See the code in `/auth` for details.

`generateApiKeyForGuild.js` is a utility for generating the key, which you should share with the person responsible for any given Discord we're integrating with.


# Discord Slash Command

We support the `/discal` command to assist generating guild/user specific .ics URLs, which is especially handy given the key auth system.

The integration itself isn't that complicated but registering and configuring the Discord bot took some trial and error.

First you need to create a Discord bot.

Then you need to register the global slash command. I used this Python code:


```
import requests

url = "https://discord.com/api/v10/applications/<THE BOT ID>/commands"

json = {
    "name": "discal",
    "type": 1,
    "description": "View your calendar feed details.",
}

headers = {
    "Authorization": "Bot <THE BOT TOKEN>"
}

requests.post(url, headers=headers, json=json)
```

Once you've jumped through the appropriate hoops, you can setup an API endpoint that confirms some functionality (proving we adhere to Discord's policies) and will offer the functionality we desire.

That Lambda code is in the `slashCommandApp` directory. It assumes an AWS API Gateway has been setup correctly for the necessary Discord headers and JSON to be passed through.