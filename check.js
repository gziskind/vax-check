var request = require('request')

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
		var message = ''
		available.forEach(function(location) {
			message += location['city'] + ": " + location['status'] + "%0A"
		})
		telegramBot += message
		request.get(telegramBot)
	}
})

