process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', function (chunk) {
	process.stdout.write('data: ' + chunk);
});










/*
var start = new Date().getTime();

var fs = require('fs');
var request = require('request');
var htmlToText = require('html-to-text');
var argv = require('minimist')(process.argv.slice(2));
var util = require('util');

const got = require('got');

var formParms = {
	input : 'abc',
	submit : '> ENCODE <',
	charset : 'UTF-8'
};


got(
	'https://www.base64encode.org/',
	{body:formParms},
	function (error, body, response) {
		console.log(body);
		console.log('\n\n' + (new Date().getTime()-start) + 'ms\n--------------------\n');

		got(
			'https://www.base64encode.org/',
			{body:formParms},
			function (error, body, response) {
				console.log(body);
				console.log('\n\n' + (new Date().getTime()-start) + 'ms');

			}
		);

	}
);
*/






/*
var request = require('request');

request.post(
	'https://www.base64encode.org/',
	{form:formParms},
	function(error, response, body) {
		console.log(body);
		console.log('\n\n' + (new Date().getTime()-start) + 'ms');
		console.log(Date.now());
	}
)
*/
