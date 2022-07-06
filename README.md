Generates .ICS files on AWS S3 for a list of Discord Guilds. This lets us subscribe to a Discord's events in our calendars.

Generates a top level ICS which contains all events, and individual calendar files for each participating user.

A few files are expected to exsit for this to function:


!! Configuration
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

The "name" field is used in the text of the calendar files only, it's exact value doesn't matter.

!! Operation


This runs in the context of an AWS Lambda, and writes to an S3 Bucket defined in .env as S3_BUCKET_NAME.

Most likely this will be scheduled to run periodically, which can be done with AWS EventBridge.


Each time the script executes it will attempt to process the Guild that was processed the longest time ago first. Only one Guild is processed at a time. The theory is we'll loop over them all forever, keepign them all in sync.

A template of a simple deploy Bash script is available. Rename it from `deploy.sh.template` to `deploy.sh`, make it executable (`chmod +x`) and swap in real values.

