const FileAccessor      = require('./FileAccessor.js')
const Guild             = require('./Guild.js')

class GuildIterator {
  // manifestPath: the S3 path to the manifest file.
  // baseFilePath: where do we store the (publicly available) generated calendar files?
  constructor(manifestPath) {
    this.manifestPath   = manifestPath;
    this.fileAccessor   = new FileAccessor(process.env.S3_BUCKET_NAME)
  }
  // Returns the array of guild data from our manifest.
  // [{id: XXXX}, {id: YYYY}, ...]
  // Preferred to use this over `this.guildList` for test purposes.
  manifest(){
    return this.guildList
  }

  async fetchManifest(){
    this.guildList = JSON.parse(await this.fileAccessor.readFile(this.manifestPath))
  }

  // Returns the next Guild object to process, according to our time oriented logic.
  async getNextGuildToProcess(){
    let lastUpdatedAts = {}
    for (const guild of this.manifest()) {      
      console.log('guild in loop', guild)
      const g = new Guild(guild.id, guild.name)
      lastUpdatedAts[guild.id] = await g.getLastUpdatedTimestamp()
    }

    console.log('lastUpdatedAts', lastUpdatedAts)

    // Sort, we'll grab the oldest to have been updated Guild, and process that.
    const oldestTimestamp = Object.values(lastUpdatedAts).sort((a, b) => {return a - b})[0];

    let oldestGuildId;
    for (let [id, ts] of Object.entries(lastUpdatedAts)) {
      if(ts === oldestTimestamp){
        oldestGuildId = id
        break;
      }
    }
    const guildRow = this.manifest().find( (row) => { return row.id == oldestGuildId })
    return new Guild(guildRow.id, guildRow.name)
  }

  // Grabs a guild for work and builds out the calendars.
  async processNextGuild(){
    const guild = await this.getNextGuildToProcess()

    console.log('GUILD TO PROCESS', guild)

    try {
      await guild.fetchEvents()
      await guild.generateCalendarFiles()
      await guild.recordSuccessfulRun()
    } catch (e) {
      console.log('Calendar write fail: ', e)
      // let's update the config file to indicate that we failed.
      await guild.recordFailedRun(e)
    }

  }

}


module.exports = GuildIterator