var request = require('request')
var dateformat = require('dateformat')

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

    if(available.length > 0) {
      var message = 'CVS Appointments: (https://www.cvs.com/vaccine/intake/store/eligibility-screener/not-eligible)' + CR
      available.forEach(function(location) {
        message += " * " + location['city'] + ": " + location['status'] + CR
      })

      sendTelegramMessage(message)
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

    if(available.length > 0) {
      var message = 'Six Flags Appointments: (https://massvax.maryland.gov)' + CR
      available.forEach(function(date) {
        message += " * Available on " + date + CR
      })

      sendTelegramMessage(message)
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
    if(body['appointmentsAvailable']) {
      var message = 'Walgreens Appointments: (https://www.walgreens.com/findcare/vaccination/covid-19/location-screening)' + CR
      message += " * " + body['zipCode'] + CR

      sendTelegramMessage(message)
    }
  })
}

function sendTelegramMessage(message) {
  var telegramBot = "https://api.telegram.org/bot" + config.botId + "/sendMessage?chat_id=" + config.chatId + "&text="

  telegramBot += message
  request.get(telegramBot)
}

checkCvs()
checkSixFlags()
checkWalgreens()
