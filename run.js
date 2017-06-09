var start = new Date().getTime();

var fs = require('fs');
var request = require('request');
// var clear = require('clear');
var agentkeepalive = require('agentkeepalive'),
	HttpsAgent = agentkeepalive.HttpsAgent,
	agent = new HttpsAgent({keepAlive: true, keepAliveTimeout:300000});
// var EOL = require('os').EOL;

// var got = require('got');
var htmlToText = require('html-to-text');
var argv = require('minimist')(process.argv.slice(2));
// var util = require('util');
// require('https').globalAgent.maxSockets = 5;
// var pool = new https.Agent(); //Your pool/agent
// request({url:"http://www.google.com", pool:pool });

var runFile = argv._[1];

if (
	process.argv.length < 4 ||
	!(authInstanceArr = argv._[0].match(/([A-Za-z0-9+/=]+)@([a-zA-Z0-9\-]+)/)) ||
	!(runFile || argv.e || argv.suite || argv.i)
){
	logFatal(
		'Usage:\n' +
		'   node run.js base64auth@instance script.js\n' +
		'Example:\n' +
		'   node run.js YWRtaW46YWRtaW4=@demo001 demo.js\n' +
		'   (YWRtaW46YWRtaW4= is admin:admin encoded using Base64)\n' +
		'Optionally, supply a scope:\n' +
		'   node run.js YWRtaW46YWRtaW4=@demo001 --scope \'x_acme_testapp\' demo.js\n');
}

var conf = {
	verbose : !!argv.v,
	interactive : !!argv.i
};

var authInstanceArr;
var scopeName = argv.scope || 'global';

var authArr = (new Buffer(authInstanceArr[1], 'base64')).toString().split(/:(.+)?/);
conf.user = authArr[0];
conf.pass = authArr[1];
conf.instance = authInstanceArr[2];
conf.host = conf.instance + '.service-now.com';
conf.baseUrl = 'https://' + conf.host + '/';

var cookiesFileName = '.org.snowlib.snow-runner.' + conf.instance + '.cookies';
var ckFileName = '.org.snowlib.snow-runner.' + conf.instance + '.ck';
var scopeFileName = '.org.snowlib.snow-runner.' + conf.instance + '.scope';

var i_script_arr = [];
var i_script;
var i_blankLineStreak = 0;
var i_fs = {};

if (conf.interactive) {

	if (process.stdin.isTTY) {
		process.stdout.write('> ');
	}

	process.stdin.resume();
	process.stdin.setEncoding('utf8');
	process.stdin.on('data', function (chunk) {

		if (process.stdin.isTTY) {

			if (isBlankLine(chunk)) {
				i_blankLineStreak++;
			} else {
				i_script_arr.push(chunk);
				i_blankLineStreak = 0;
			}

			if (i_blankLineStreak < 1 || !i_script_arr.length) {
				process.stdout.write('> ');
				return;
			}

		} else {
			i_script_arr.push(chunk);
		}

		// outputLn('Submitting to ' + conf.instance + '...\n');
		i_script = i_script_arr.join('\n');
		i_script_arr = [];
		i_blankLineStreak = 0;
    start = new Date().getTime();
    main();
 	});
} else {
	main();
}

function main() {

	var defaultActionFn = function() {
		getScript( function(script) {
			runScriptUsingNewSession(script);
		});
	};

	getFileData(cookiesFileName, defaultActionFn, function (cookiesData) {
		var cookieJar = request.jar();
		cookieJar.setCookie(cookiesData, conf.baseUrl);
		getFileData(ckFileName, defaultActionFn, function (ckData) {
			getFileData(scopeFileName, defaultActionFn, function (scopeData) {
				if (scopeData == 'undefined') {
					scopeData = undefined;
				}
				getScript(function (script) {
					runScriptUsingExistingSession(cookieJar, script, ckData, scopeData);
				});
			});
		});
	});
}

function isBlankLine(str) {
  return !!str.match(/^\s*$/);
}

function getFileData(filePath, onNotFound, onComplete) {
	if (conf.interactive) {
		var fileData = i_fs[filePath];
		if (!fileData) {
			onNotFound();
		} else {
			onComplete(fileData);
		}

	} else {
		fs.readFile(filePath, function (err, data) {
			if (err) {
				if (err.code !== 'ENOENT') {
					logFatal(err);
				}
				onNotFound();
			} else {
				var fileData = data.toString();
				onComplete(fileData);
			}
		});
	}
}

function getScript(onComplete) {

	if (conf.interactive) {
		onComplete(i_script);

	} else if (argv.suite) {
		onComplete(
			'gs.include("SnowLib.Tester.Suite");' +
			'SnowLib.Tester.Suite.getByName("' + argv.suite + '").run();'
		);

	} else if (argv.e) {
		onComplete(argv.e);

	} else {
		fs.readFile(runFile, function(err, data) {
			if (err) { logFatal(err); }
			if (!data.length){
				logFatal('Error: Script file is empty.');
			}
			onComplete(data);
		});
	}
}

function runScriptUsingExistingSession(cookieJar, script, ck, sysScope) {
	request = request.defaults({ jar:cookieJar, followAllRedirects:true, agent: agent });
	// https.request({agent:pool});

	/* getForm(
	 function() { // onUnrecognized
	 runScriptUsingNewSession(script);
	 },
	 function(ck, sysScope) { // onComplete */
	// logInfo('Using existing session submitting with\n  ck:' + ck + '\n  sysScope:' + sysScope + '\n  typeof sysScope:' + typeof sysScope + '\n');
	submit( ck, script, sysScope,
		function() { // onForbidden
			runScriptUsingNewSession(script);
		},
		function() { // onComplete
			// saveCookies(cookieJar);
			// submit( ck, script, sysScope, function() {}, function() {});
		}
	);
	/* }
	 ); */
}


// function submit(ck, script, sysScope, onForbidden, onComplete);

function runScriptUsingNewSession(script) {
	request = require('request');
	var cookieJar = request.jar();
	request = request.defaults({ jar : cookieJar, followAllRedirects : true, agent:agent });
	login( function() { // onComplete
		elevate( function(ck) { // onComplete
			getForm(
				function() { // onUnrecognized
					logFatal('\nError: Did not recognize sys.scripts.do in new session.');
				},
				function(ck, sysScope) { // onComplete
					submit( ck, script, sysScope,
						function() { // onForbidden
							logFatal('\nError: Could not submit script due to security restriction.');
						},
						function() { // onComplete
							saveCookies(cookieJar);
							saveFile(ckFileName, ck);
							saveFile(scopeFileName, sysScope);
						}
					);
				}
			);
		});
	});
}

function login(onComplete) {
	logInfo('Logging in to ' + conf.host + ' as ' + conf.user + '... ');
	var formParms = {
		user_name : conf.user,
		user_password : conf.pass,
		sys_action : 'sysverb_login',
		sysparm_login_url : 'welcome.do'
	};
	request.post(
		conf.baseUrl + 'login.do',
		{form:formParms},
		function(error, response, body) {
			// logInfoLn('STATUS: ' + response.statusCode);
			// logInfoLn('HEADERS: ' + JSON.stringify(response.headers));
			body = body || '';
			var m;
			if (/User name or password invalid/.test(body)) {
				logFatal('\nError: User name or password invalid.');

			} else if (!(m = body.match(/userObject.setElevatedRoles\('(.*)'\);/))) {
				logFatal('\nError: Unrecognized page returned after login.\n' + body);

			} else if (m[1].split(',').indexOf('security_admin') === -1) {
				logFatal('\nError: Insufficient privileges. Must have security_admin to run code.');

			} else {
				logInfoLn('Success.');
				onComplete();

			}
		}
	);
}

function elevate(onComplete) {
	logInfo('Elevating... ');
	var formParms = {
		elevated_roles : 'security_admin',
		elevated_role : 'security_admin',
		sys_action : 'none'
	};
	request.post(
		conf.baseUrl + 'ui_page_process.do?sys_id=b80fa99a0a0a0b7f2c2a0da76c12ae00',
		{form:formParms},
		function(error, response, body) {
			body = body || '';
			var m;
			var ckm;
			if ( !(m = body.match(/userObject.setActiveElevatedRoles\('(.*)'\);/)) ||
				!( ckm = body.match(/var g_ck = '([a-f0-9]+)';/)) ) {
				logFatal('\nError: Unrecognized page returned after elevating.\n' + body);

			} else if (m[1].split(',').indexOf('security_admin') === -1) {
				logFatal('\nError: Elevation did not succeed.');

			} else {
				logInfoLn('Success.');
				onComplete(ckm[1]);

			}
		}
	);
}

function getForm(onUnrecognized, onComplete) {
	logInfo('Loading sys.scripts.do form... ');
	request.get(
		conf.baseUrl + 'sys.scripts.do',
		function(error, response, body) {
			body = body || '';
			var ckm;
			if ( !(ckm = body.match(/name="sysparm_ck" type="hidden" value="([a-f0-9]+)"/)) ) {
				logInfoLn('Unrecognized / Redirect.');
				onUnrecognized();
				// logFatal('\nError: Unrecognized page returned when loading sys.scripts.do.\n' + body);

			} else {
                var sysScope = getScopeOptionValue(body);
                logInfoLn('Success.');
                onComplete(ckm[1], sysScope);
			}
		}
	);

    function getScopeOptionValue(body) {
        var regex = new RegExp("<option.*value=\"([a-f0-9]+)\">" + scopeName + "</option>");
        var match = body.match(regex);
        if (match) return match[1];

        // In Fuji the option value for global is a sys_id, in Helsinki (and Geneva?) it is 'global'
        // so the regex above fails to match.
        // If we wanted global scope, return 'global'
        if (scopeName === 'global') return 'global';

        // Otherwise, the scope option value was not found, so fail
        logFatal('\nError: Scope \'' + scopeName + '\' not recognized in sys.scripts.do form.\n');
    }
}

function submit(ck, script, sysScope, onForbiddenOrUnrecognized, onComplete) {
	var formParms = {
		sysparm_ck : ck,
		script : script,
		runscript : 'Run script',
		sys_scope : sysScope
	};
	/* if (sysScope) {
	 formParms.sys_scope = sysScope;
	 } */
	// logInfoLn(util.inspect(formParms));
	// logInfoLn(util.inspect(request));

	/*
	 var options = {
	 method: 'POST',
	 headers: {
	 'Host': conf.host,
	 'User-Agent': 'request'
	 }
	 };
	 */

	request.post(
		conf.baseUrl + 'sys.scripts.do',
		{form:formParms},
		function(error, response, body) {
			if(response.statusCode == 403 || !body.match(/^\[[\d\.]+\]*/)) {
				onForbiddenOrUnrecognized();

			} else {

				outputLn(htmlToText.fromString(
						body.replace(/<HR\/>/i, '<BR/><HR/>').replace(/\n/g, '<BR/>'),
						{wordwrap: process.stdout.columns}
					) +'\n\n');

				if (process.stdin.isTTY) {
					process.stdout.write('> ');
				}

				logInfoLn((new Date().getTime() - start) + ' ms');
				onComplete();
			}
		}
	);
}

function saveCookies(cookieJar) {
	saveFile(cookiesFileName, cookieJar.getCookieString(conf.baseUrl));
	/* var cookieString = cookieJar.getCookieString(conf.baseUrl);
	 fs.writeFile(conf.cookieFileName, cookieString, function(err) {
	 if (err) { logFatal(err); }
	 }); */
}

function saveFile(filePath, fileData) {
	if (conf.interactive) {
		i_fs[filePath] = fileData;

	} else {
		fs.writeFile(filePath, fileData, function (err) {
			if (err) {
				logFatal(err);
			}
		});
	}
}

function logFatal(msg, exitCode) {
	console.log(msg);
	process.exit(exitCode === undefined ? 1 : exitCode);
}

function outputLn(msg) {
	process.stdout.write(msg);
}

function logInfoLn(msg) {
	logInfo(msg + '\n');
}

function logInfo(msg) {
	if (conf.verbose) {
		process.stdout.write(msg);
	}
}
