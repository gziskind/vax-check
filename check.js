var request = require('request')

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
      if(location['status'] != "Fully Booked"){
        available.push(location)
      }
    })

    if(available.length > 0) {
      var message = 'CVS Appointments:' + CR
      available.forEach(function(location) {
        message += " * " + location['city'] + ": " + location['status'] + CR
      })

      sendTelegramMessage(message)
    }
  })
}

function checkSixFlags() {
  var mtOptions = {
    url: "https://api-massvax.maryland.gov/public/locations/a0Z3d000000HCTiEAO/availability",
    headers:{
      "Content-type":"application/json;charset=UTF-8"
    },
    json:{
      "startDate":"2021-03-01",
      "endDate":"2021-03-31",
      "vaccineData":"WyJhMVYzZDAwMDAwMDAyMmdFQUEiXQ==",
      "doseNumber":1,
      "url":"https://massvax.maryland.gov/appointment-select"
    }
  }

  request.post(mtOptions, function(error, response, body) {
    var available = []
    body["availability"].forEach(function(day) {
      if(day['available']) {
        available.push(day['date'])
      }
    })

    if(available.length > 0) {
      var message = 'Six Flags Appointments:' + CR
      available.forEach(function(date) {
        message += " * Available on " + date + CR
      })

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
