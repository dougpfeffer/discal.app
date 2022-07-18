const ical              = require("ical-generator");
const moment            = require("moment");
const path              = require('path');

const FileAccessor      = require('./FileAccessor.js')
const EventLoader       = require("./EventLoader.js")


// The bulk of the logic in this tool revolves around individual Guilds.
// This class is responsible for loading the appropriate Discord data, saving out the calendar files, and updating config files.
class Guild {
  constructor(id, name){
    this.id = id
    this.name = name
    this.fileAccessor   = new FileAccessor(process.env.S3_BUCKET_NAME)
    this.configFilePath = path.join('guilds', this.id, '_config.json')
    this.events = [] // Set by `fetchEvents`
  }

  async configFile(){
    const filePath = this.configFilePath
    console.log('filePath', filePath)
    return await this.fileAccessor.readFile(filePath)
  }

  // Given a Guild ID, returns the timestamp it was lasted processed.
  // Generally we'll want to 
  async getLastUpdatedTimestamp(){
    let lastUpdatedAt;
    try {    
      const configData = JSON.parse(await this.configFile())
      console.log('configData', configData.lastUpdatedAt)
      lastUpdatedAt = configData.lastUpdatedAt
    } catch (e) {
      console.log('Error opening config file for guild id', this.id, e)
      lastUpdatedAt = 0 // Returns a 0 timestamp lets us pretend its a very old updatedAt, triggering a retry.
    }
    return lastUpdatedAt
  }

  async fetchEvents() {
    const eventLoader = new EventLoader(this.id)
    this.events = await eventLoader.fetchEvents()
  }

  // Updates our config file to indicate that we ran succesfully.
  async recordSuccessfulRun(){
    await this.fileAccessor.saveFile(this.configFilePath, JSON.stringify({lastUpdatedAt: Date.now(), status: 'success'}))    
  }

  // Updates our config file with the time we failed, and the error.
  async recordFailedRun(e){
    console.log(`[recordFailedRun] ${this.id}`, e)
    await this.fileAccessor.saveFile(this.configFilePath, JSON.stringify({lastUpdatedAt: Date.now(), status: 'error', error: e.toString()}))    
  }

  // Writes out (to S3) the global calendar for this guild AND all the individual user calendar files.
  async generateCalendarFiles(){
    let attendeesToEvents   = {}
    let attendeeIdsToNames  = {}

    const globalCalendar = ical({
      name: `${this.name} Cal`
    }).ttl(60 * 60);

    // We have to kind of invert the `attendees`, so we match an attendee up to all their events.
    this.events.forEach( (event) => {
      // Build out the global calendar as we split out the user events.
      this.addEventToCalendar(globalCalendar, event)

      // Build out a structure of each user and all their events.
      event.users.forEach( (att) => {
        // Also build a list of IDs to names, for display purposes:
        attendeeIdsToNames[att.user.id] = att.user.username
        if(attendeesToEvents[att.user.id]){
          attendeesToEvents[att.user.id].push(event)
        } else {
          attendeesToEvents[att.user.id] = [event]
        }
      })      
    })

    await this.fileAccessor.saveFile(`guilds/${this.id}/events.ics`, globalCalendar.toString())

    for (const attendee in attendeesToEvents) {

      // Pull out your username for display in the personalized ICS files:
      const username = attendeeIdsToNames[attendee]

      const userCalendar = ical({
        name: `@${username} ${this.name} Cal`
      }).ttl(60 * 30);
      attendeesToEvents[attendee].forEach( (ev) => {
        this.addEventToCalendar(userCalendar, ev)
      })

      await this.fileAccessor.saveFile(`guilds/${this.id}/users/${attendee}/events.ics`, userCalendar.toString())
    }    
  }

  // Given a Calendar object and a Discord event, apply the given event to the Calendar.
  // This adjusts the Calendar object in-place, no need to deal with the return value.
  addEventToCalendar(cal, event){
    let description = event.description
    cal.createEvent({
      start: moment.utc(event.scheduled_start_time),
      end:  event.scheduled_end_time ? moment.utc(event.scheduled_end_time) : moment.utc(event.scheduled_start_time).add(1, 'hour'),
      summary: event.name,
      description: description
    })
    return cal
  }

}

module.exports = Guild