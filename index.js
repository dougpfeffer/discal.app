// A little script to access Discord events for a given Guild and generate ICS files for calendar subscriptions.
// Generates a top level list of events (`_def.ics`, in this case), as well as user specific calendars (`<username>.ics``).

// Expects a .env file to exist with a Discord Bot Client Token (`CLIENT_TOKEN`) and a `GUILD_ID`, to identify your Discord group.

// This runs in the context of an AWS Lambda, and writes to an S3 Bucket defined in .env as S3_BUCKET_NAME.

// Most likely this will be scheduled to run periodically, which can be done with AWS EventBridge.

require('dotenv').config(); //initialize dotenv

const axios = require('axios').default;
const ical = require("ical-generator");
const moment = require("moment");
const fs = require('fs')
const aws = require('aws-sdk');
const s3 = new aws.S3({ apiVersion: '2006-03-01' });

exports.handler = async (event) => {

  const pageSize = 100
  const baseUrl = `https://discord.com/api/guilds/${process.env.GUILD_ID}/scheduled-events`

  // Cache all the events in here.
  let events = []

  // First load up the list of events from Discord.
  const res = await axios.get(baseUrl, {
    headers: {
      'Authorization': `Bot ${process.env.CLIENT_TOKEN}`
    }
  }).then( async (res) => {
    // Then for each event we we'll fetch the number of attendees, so we know how many to crawl for.
    for(let i = 0; i < res.data.length; i++){

      // Discord's rate limiting is strict. It returns instructions on when we can make our next call.
      await new Promise(resolve => setTimeout(resolve, 1000 * parseInt(res.headers['x-ratelimit-reset-after'])));  

      
      const eventUrl = `${baseUrl}/${res.data[i].id}?with_user_count=true`
      // Find out how many users it has
      await axios.get(eventUrl, {
        headers: {
          'Authorization': `Bot ${process.env.CLIENT_TOKEN}`
        }
      }).then( async (eventRes) => {
        // Lastly, page through each set of aattendees. Unlikely we'll have multiple pages, but why not.
        let eventData = eventRes.data

        // Sleep for the required amount of time.
        await new Promise(resolve => setTimeout(resolve, 1000 * parseInt(eventRes.headers['x-ratelimit-reset-after'])));

        let usersForEvent = []
        while(usersForEvent.length < eventRes.data.user_count){
          const lastUserId = (usersForEvent.length > 0 ? usersForEvent[usersForEvent.length - 1].user.id : 0)
          const gotUsersRes = await getEventUsers(baseUrl, res.data[i].id, lastUserId, pageSize)
          await new Promise(resolve => setTimeout(resolve, 1000 * parseInt(gotUsersRes.headers['x-ratelimit-reset-after'])));
          usersForEvent = usersForEvent.concat(gotUsersRes.data)
        }

        eventData.attendees = usersForEvent
        events.push(eventData)

      })
    }

  })


  // Now that we have all the JSON, we can massage into the various calendar files.
  let attendeesToEvents = {}

  const globalCalendar = ical({
    name: `Def Cal`
  }).ttl(60 * 60);

  // We have to kind of invert the `attendees`, so we match an attendee up to all their events.
  events.forEach( (event) => {
    // Build out the global calendar as we split out the user events.
    createEventForCalendar(globalCalendar, event)

    event.attendees.forEach( (att) => {
      if(attendeesToEvents[att.user.username]){
        attendeesToEvents[att.user.username].push(event)
      } else {
        attendeesToEvents[att.user.username] = [event]
      }
    })
  })

  // Save the top level calendar to the bucket.
  let s3UploadParams = {
      Bucket:  process.env.S3_BUCKET_NAME,
      Key: '_def.ics',
      Body: globalCalendar.toString(),
  };
  await s3.upload(s3UploadParams).promise();

  // // Now write out the calendar files for each person:
  for (const attendee in attendeesToEvents) {
    const cal = ical({
      name: `@${attendee} Def Cal`
    }).ttl(60 * 30);
    attendeesToEvents[attendee].forEach( (ev) => {
      createEventForCalendar(cal, ev)
    })
    let s3UploadParams = {
        Bucket:  process.env.S3_BUCKET_NAME,
        Key: `${attendee.toLowerCase()}.ics`,
        Body: cal.toString(),
    };
    await s3.upload(s3UploadParams).promise();    
  }

  // No one will see the response, but post back a success.
  const response = {
      statusCode: 200,
      body: `Events Processed: ${events.length}`,
  };
  return response;
};


// For a given event, with pagination details, load in those users.
async function getEventUsers(baseUrl, eventId, afterUserId, limit){
  return new Promise(resolve => {
    let users;
    let usersUrl = `${baseUrl}/${eventId}/users?limit=${limit}`
    if(afterUserId !== 0){
      usersUrl = usersUrl + '&after=' + afterUserId
    }
    return axios.get(usersUrl, {
      headers: {
        'Authorization': `Bot ${process.env.CLIENT_TOKEN}`
      }
    }).then( (usersRes) => {
      resolve(usersRes)
    })
    
  })
}


// Given a Calendar object and a Discord event, apply the given event to the Calendar.
// This adjusts the Calendar object in-place, no need to deal with the return value.
function createEventForCalendar(cal, event){
  let description = event.description
  // Mash the attendees into the description, not as actial calendar attendees.
  // Putting them in as actual calendar attendees introduces two problems:
  // 1. We don't get email addresses from Discord, so the emails have to be fake, like `someone@example.com`.
  // 2. If you delete an event from your calendar, your calendar will try to email all the attendees the updated. And since these email
  // addresses are fake, the emails will all bounce back and it's annoying.
  description += "\n\nAttendees:\n\n"
  event.attendees.forEach( (user) => {
    description += `- ${user.user.username}\n`
  })

  cal.createEvent({
    start: moment.utc(event.scheduled_start_time),
    end:  event.scheduled_end_time ? moment.utc(event.scheduled_end_time) : moment.utc(event.scheduled_start_time).add(1, 'hour'),
    summary: event.name,
    description: description
  })
  return cal
}




