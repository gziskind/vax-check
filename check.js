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
    url: "https://api-massvax.maryland.gov/public/locations/a0Z3d000000HCTiEAO/availability",
    headers:{
      "Content-type":"application/json;charset=UTF-8"
    },
    json:{
      "startDate":dateformat(today,"yyyy-mm-dd"),
      "endDate":dateformat(end,"yyyy-mm-dd"),
      "vaccineData":"WyJhMVYzZDAwMDAwMDAyMmdFQUEiXQ==",
      "doseNumber":1,
      "url":"https://massvax.maryland.gov/appointment-select"
    }
  }

  request.post(options, function(error, response, body) {
    var available = []
    body["availability"].forEach(function(day) {
      if(day['available']) {
        available.push(day['date'])
      }
    })

    var file = getStatusFile(".sixflags-message")
    var previousMessage = getPreviousMessage(file)

    if(available.length > 0) {
      var message = 'Six Flags Appointments: (https://massvax.maryland.gov)' + CR
      available.forEach(function(date) {
        message += " * Available on " + date + CR
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

function checkWalgreens() {
  var options = {
    url: "https://www.walgreens.com/hcschedulersvc/svc/v1/immunizationLocations/availability",
    headers:{
      "Content-type":"application/json;charset=UTF-8"
    },
    json:{
      "serviceId":"99",
      "position":{
        "latitude":38.9875145,
        "longitude":-77.0737149
      },
      "appointmentAvailability":{
        "startDateTime":"2021-03-02"
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
  sendTelegramMessage(message, config.chatId)
  sendTelegramMessage(message, config.channelId)
}

function sendTelegramMessage(message, chatId) {
  var telegramBot = "https://api.telegram.org/bot" + config.botId + "/sendMessage?chat_id=" + chatId + "&text="

  telegramBot += message
  request.get(telegramBot)
}

checkCvs()
checkSixFlags()
checkWalgreens()
