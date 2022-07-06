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

`/guilds/<guild id>/events.ics`

`/guilds/<guild id>/users/<user id>/events.ics`

A template of a simple deploy Bash script is available. Rename it from `deploy.sh.template` to `deploy.sh`, make it executable (`chmod +x`) and swap in real values.

