var request = require('request')
var dateformat = require('dateformat')
var fs = require('fs')
var path = require('path')

var config = require('./config')

var CR = "%0A"

function checkCvs() {
  var options = {
    url: "https://www.cvs.com/immunizations/covid-19-vaccine.vaccine-status.MD.json?vaccineinfo",
    headers: {
      referer: "https://www.cvs.com/immunizations/covid-19-vaccine?icid=cvs-home-hero1-link2-coronavirus-vaccine"
    }
  }

  request.get(options, function(error, response, body) {
    var locations = JSON.parse(body)['responsePayloadData']['data']['MD']
    var available = []
    locations.forEach(function(location) {
      if(location['status'] != "Fully Booked" && !config.cityExcludes.includes(location['city'])){
        available.push(location)
      }
    })

    var file = getStatusFile(".cvs-message")
    var previousMessage = getPreviousMessage(file)

    if(available.length > 0) {
      var message = 'CVS Appointments: (https://www.cvs.com/immunizations/covid-19-vaccine)' + CR
      available.forEach(function(location) {
        message += " * " + location['city'] + ": " + location['status'] + CR
      })

      if(message != previousMessage) {
        fs.writeFileSync(file, message)
        sendTelegramMessages(message)
      }
    } else {
      fs.writeFileSync(file,"")
    }
  })
}

function checkSixFlags() {
  var today = new Date()
  today.setDate(today.getDate() + 1)
  var end = new Date()
  end.setMonth(today.getMonth()+1);

  var options = {
    url: "https://api-massvax.maryland.gov/public/locations/search",
    headers:{
      "Content-type":"application/json;charset=UTF-8"
    },
    json:{
      "location":{
        "lat":39.0038878,
        "lng":-77.1053673
      },
      "fromDate":dateformat(today,"yyyy-mm-dd"),
      "vaccineData":"WyJhMVYzZDAwMDAwMDAyMmdFQUEiLCJhMVYzZDAwMDAwMDAyT0FFQVkiXQ==",
      "locationQuery":{
        "includePools":["default"]
      },
      "doseNumber":1,
      "url":"https://massvax.maryland.gov/location-select"
    }
  }


  request.post(options, function(error, response, body) {
    var available = {}
    body["locations"].forEach(function(location) {
      var name = location['name']
      if(location['openHours'].length > 0) {
        location['openHours'].forEach(function(openHours) {
          openHours['days'].forEach(function(day) {
            if(!available[name]) {
              available[name] = []
            } 
            available[name].push(day)
          })
        })
      }
    })

    var file = getStatusFile(".sixflags-message")
    var previousMessage = getPreviousMessage(file)

    var keys = Object.keys(available)

    var message = ''
    keys.forEach(function(key) {
      message += key + ' Appointments: (https://massvax.maryland.gov)' + CR
      available[key].forEach(function(day) {
        message += " * Available on " + day + CR
      })
    })

    if(message != previousMessage) {
      fs.writeFileSync(file, message)
      sendTelegramMessages(message)
    }

    if(keys.length === 0) {
      fs.writeFileSync(file,"")
    }
  })
}

function checkWalgreens() {
  var today = new Date()
  today.setDate(today.getDate() + 1)

  var options = {
    url: "https://www.walgreens.com/hcschedulersvc/svc/v1/immunizationLocations/availability",
    headers:{
      "Content-type":"application/json;charset=UTF-8",
      "origin": "https://www.walgreens.com",
      "x-xsrf-token": config.walgreens.headerXsrfToken,
      "cookie": config.walgreens.cookieXsrfToken
    },
    json:{
      "serviceId":"99",
      "position":{
        "latitude":38.9875145,
        "longitude":-77.0737149
      },
      "appointmentAvailability":{
        "startDateTime":dateformat(today,"yyyy-mm-dd")
      },
      "radius":25
    }
  }

  request.post(options, function(error, response, body) {
    var file = getStatusFile(".walgreens-message")
    var previousMessage = getPreviousMessage(file)

    if(body['appointmentsAvailable']) {
      var message = 'Walgreens Appointments: (https://www.walgreens.com/findcare/vaccination/covid-19/location-screening)' + CR
      message += " * " + body['zipCode'] + CR

      if(message != previousMessage) {
        fs.writeFileSync(file, message)
        sendTelegramMessages(message)
      }
    } else {
      fs.writeFileSync(file,"")
    }
  })
}

function checkMTBank() {
  var options = {
    url:"https://signupandschedule.umm.edu/mychart/OpenScheduling/OpenScheduling/GetOpeningsForProvider?noCache=0.30118650554066395",
    headers: {
      "__RequestVerificationToken": config.mtbank.requestToken,
      "Cookie":config.mtbank.cookieRequestToken
    },
    formData: {
      id: "RES^84002860",
      vt: "22759",
      view: "grouped"
    }
  }

  request.post(options, function(error, response, body) {
    var json = JSON.parse(body);
    var file = getStatusFile(".mt-message")
    var previousMessage = getPreviousMessage(file)

    if(Object.keys(json['AllDays']).length > 0) {
      var message = "Check MT Bank Appts" + CR;

      if(message != previousMessage) {
        fs.writeFileSync(file, message)
        sendTelegramMessages(message)
      }
    } else {
      fs.writeFileSync(file,"")
    }
  })

}

function getStatusFile(filename) {
  return path.join(__dirname, filename)
}

function getPreviousMessage(file) {
  var previousMessage = ""
  if(fs.existsSync(file)) {
    previousMessage = fs.readFileSync(file).toString()
  }

  return previousMessage
}

function sendTelegramMessages(message) {
  message = encodeMessage(message)
  sendTelegramMessage(message, config.chatId)
  if(config.production) {
    sendTelegramMessage(message, config.channelId)
  }
}

function encodeMessage(message) {
  message = message.replace(/&/g,'and')
  return message
}

function sendTelegramMessage(message, chatId) {
  var telegramBot = "https://api.telegram.org/bot" + config.botId + "/sendMessage?chat_id=" + chatId + "&text="

  telegramBot += message
  request.get(telegramBot)
}

checkCvs()
checkSixFlags()
checkWalgreens()
checkMTBank()
