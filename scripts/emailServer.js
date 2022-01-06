"use strict";
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
let dotenv = require('dotenv').config({ path: './.env' })
const nodemailer = require("nodemailer");
const emailName = process.env.EMAILNAME;
const emailAddress = process.env.EMAILADDRESS;
const password = process.env.PASSWORD;
const emailRecipient = process.env.EMAILRECIPIENT;

app.use(express.static('public'));
// parse application/x-www-form-urlencoded, parse application/json
// Add headers
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(function (req, res, next) {
	// Website you wish to allow to connect
	// Request: methods you wish to allow
	// Request headers you wish to allow
	// Set to true if you need the website to include cookies in the requests sent to the API (e.g. in case you use sessions)
	// Pass to next layer of middleware
	var allowedOrigins = ['http://localhost:3000', 'http://localhost:8183'];
	var origin = req.headers.origin;
	if (allowedOrigins.indexOf(origin) > -1) {
		res.setHeader('Access-Control-Allow-Origin', origin);
	}
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
	res.setHeader('Access-Control-Allow-Credentials', true);
	next();
});

app.get('/send_email', async function (req, res) {
	let subject = req.query.subject;
	let body = req.query.body;
	let transporter = nodemailer.createTransport({
		host: "smtp.gmail.com",
		port: 587,
		secure: false, // true for 465, false for other ports
		auth: {
			user: emailAddress,
			pass: password,
		},
	});

	let info = await transporter.sendMail({
		from: '"' + emailName + '" <' + emailAddress + ">",
		to: emailRecipient,
		subject: subject,
		html: body, //alt: //text: "How great is that!", // plain text body
	});
	console.log("Message sent: %s", info.messageId);
	res.end(JSON.stringify(info.messageId));

})

var server = app.listen(8183, function () {
	var host = server.address().address
	var port = server.address().port
	console.log("Email endpoint listening at http://%s:%s", host, port)
})