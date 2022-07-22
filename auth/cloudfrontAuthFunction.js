// This is a CloudFront Viewer Request function that puts a simple authentication layer in from ouf our .ics files.
// It expects a ?key be present in the URL for any file behind the CloudFront distribution, for example:
// https://api.discal.app/guilds/890053994926460939/events.ics?key=XXXX

// Any request that doesn't have a Guild ID in the expected part of the URL, or has an invalid key, will receive a 401 response.

// This means nothing but these .ics files - in our /guilds/<id>/etc format - can ever be served from the domain the CF distro serves, but that's fine.

// This code is deployed through a weird <textarea> in CloudFront > Functions.

// See generateApiKeyForGuild.js for details on generated the key for any given Guild.

var crypto = require('crypto');

var response401 = {
  statusCode: 401,
  statusDescription: 'Unauthorized'
};    

function handler(event) {
    if(!event.request.querystring.key){
      return response401;
    }
    
     // We can't setup this key with an env var or secret or anything, and i'm not going to commit it here.
     // So before modifying this in CloudFront you'll have to enter the real key, which is DISCAL_AUTH_SECRET in .env.
    var defcalSecret = "XXXXXXXX"
    
    // Expects the URI to be like ""https://discal.app/guilds/1232354345345/..."
    // We want to extract that ID.
    var guildId = event.request.uri.match(/guilds\/(.*)\//)[1].toUpperCase() // Upcase it here, and when we generate the key, just to avoid any case sensitivity foolishness.

    var expectedHash = crypto.createHash('md5').update(defcalSecret + guildId).digest('base64url')

    if(expectedHash.toUpperCase() == event.request.querystring.key.value.toUpperCase()){
      return event.request; // If it's all good just pass the request on, and CloudFront will continue the normal process.
    } else {
      return response401;
    }
  }