require('dotenv').config()
const axios = require('axios').default;

// Loads events for a given Guild ID, returning those events and all their attendees.
// Takes Discord's rate limiting directions into account, so this may take a minute or so to complete.
class EventLoader {
  constructor(guildId){
    axios.defaults.headers.common['Authorization'] = `Bot ${process.env.CLIENT_TOKEN}`;
    this.baseUrl = `https://discord.com/api/guilds/${guildId}/scheduled-events`
  }

  // Returns an array of events with their users.
  async fetchEvents(){
    let eventsWithUsers = []
    const {events, headers} = await this.getEvents()
    for(let i = 0; i < events.length; i++){
      // Discord's rate limiting is strict. It returns instructions on when we can make our next call.
      await new Promise(resolve => setTimeout(resolve, 1000 * parseInt(headers['x-ratelimit-reset-after'])));
      
      console.log('event id', events[i].id)
      const eventDetails = await this.getEventDetails(events[i].id)
      console.log('eventDetails', eventDetails.details)
      await new Promise(resolve => setTimeout(resolve, 1000 * parseInt(eventDetails.headers['x-ratelimit-reset-after'])));
      
      // Load in the participants via pagination
      const users = await this.getEventUsers(events[i].id, eventDetails.details.user_count)
      console.log('users', users)

      eventsWithUsers.push({
        ...eventDetails.details,
        ...{users: users}
      })
    }
    return eventsWithUsers
  }

  // Returns a single list of attendees for a given event, paginating as needed.
  async getEventUsers(eventId, userCount){
    let usersForEvent = []
    while(usersForEvent.length < userCount){
      const lastUserId = (usersForEvent.length > 0 ? usersForEvent[usersForEvent.length - 1].user.id : 0)
      const usersPageResponse = await this.getEventUsersPage(eventId, lastUserId)
      await new Promise(resolve => setTimeout(resolve, 1000 * parseInt(usersPageResponse.headers['x-ratelimit-reset-after'])));
      usersForEvent = usersForEvent.concat(usersPageResponse.data)
    }
    return usersForEvent
  }

  // Fetches a single users page, from the list of attendees.
  async getEventUsersPage(eventId, afterUserId) {
    let usersUrl = `${this.baseUrl}/${eventId}/users?limit=100`
    if(afterUserId !== 0){
      usersUrl = usersUrl + '&after=' + afterUserId
    }
    return await axios.get(usersUrl)
  }

  async getEvents(){
    const response = await axios.get(this.baseUrl)
    return {status: response.status, events: response.data, headers: response.headers}
  }

  async getEventDetails(eventId){
    const url = `${this.baseUrl}/${eventId}?with_user_count=true`    
    const response = await axios.get(url)
    return {status: response.status, details: response.data, headers: response.headers}
  }
}

module.exports = EventLoader