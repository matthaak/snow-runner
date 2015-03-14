var fs = require('fs');
var request = require('request');
var htmlToText = require('html-to-text');
var argv = require('minimist')(process.argv.slice(2));

(function() {

	var conf = {
		verbose : false
	};

	var runFile = argv._[1];
	var authInstanceArr;

	if (
		process.argv.length < 4 ||
			!(authInstanceArr = argv._[0].match(/([A-Za-z0-9+/=]+)@([a-zA-Z0-9\-]+)/)) ||
			!(runFile || argv.e || argv.suite)
		){
		logFatal(
				'Usage:\n' +
				'   node run.js base64auth@instance script.js\n' +
				'Example:\n' +
				'   node run.js YWRtaW46YWRtaW4=@demo001 demo.js\n' +
				'   (YWRtaW46YWRtaW4= is admin:admin encoded using Base64)\n' +
		  	'Optionally, supply a as in:\n' +
			  '   node run.js YWRtaW46YWRtaW4=@demo001 --scope \'x_acme_testapp\' demo.js\n');
	}

	var authArr = (new Buffer(authInstanceArr[1], 'base64')).toString().split(/:(.+)?/);
	conf.user = authArr[0];
	conf.pass = authArr[1];
	conf.instance = authInstanceArr[2];
	conf.host = conf.instance + '.service-now.com';
	conf.baseUrl = 'https://' + conf.host + '/';
	conf.cookieFileName = '.snow-runner.' + conf.instance + '.cookies';

	fs.readFile(conf.cookieFileName, function(err, data) {
		if (err) {
			if (err.errno != 34) { logFatal(err); }
			getScript( function(script) {
				runScriptUsingNewSession(script);
			});
		} else {
			getScript( function(script) {
				var cookieJar = request.jar();
				cookieJar.setCookie(data.toString(), conf.baseUrl);
				runScriptUsingExistingSession(cookieJar, script);
			});
		}
	});

	function getScript(onComplete) {
		if (argv.suite) {
			onComplete(
				'gs.include("FP.Test.Runner");' +
					'with(FP.Test.Runner){add(\'' + argv.suite + '\');gs.print(\'\\n\'+run().output);}'
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

	function runScriptUsingExistingSession(cookieJar, script) {
		request = request.defaults({ jar : cookieJar, followAllRedirects : true });
		getForm(
			function() { // onUnrecognized
				runScriptUsingNewSession(script);
			},
			function(ck, sysScope) { // onComplete
				submit( ck, script, sysScope,
					function() { // onForbidden
						runScriptUsingNewSession(script);
					},
					function() { // onComplete
						saveCookies(cookieJar);
					}
				);
			}
		);
	}

	function runScriptUsingNewSession(script) {
		request = require('request');
		var cookieJar = request.jar();
		request = request.defaults({ jar : cookieJar, followAllRedirects : true });
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
					var sysScope;
					if (argv.scope) {
						var m;
						if ( (m = body.match(new RegExp("<option value=\"([a-f0-9]+)\">" + argv.scope + "</option>"))) ) {
							sysScope = m[1];
						} else {
							logFatal('\nError: Scope \'' + argv.scope + '\' not recognized in sys.scripts.do form.\n');
						}
					}

					logInfoLn('Success.');
					onComplete(ckm[1], sysScope);

				}
			}
		);


	}

	function submit(ck, script, sysScript, onForbidden, onComplete) {
		var formParms = {
			sysparm_ck : ck,
			script : script,
			runscript : 'Run script'
		};
		if (sysScript) {
			formParms.sys_scope = sysScript;
		}
		request.post(
			conf.baseUrl + 'sys.scripts.do',
			{form:formParms},
			function(error, response, body) {
				if(response.statusCode == 403) {
					onForbidden();
				}
				outputLn(htmlToText.fromString(
					body.replace(/<HR\/>/i, '<BR/><HR/>').replace(/\n/g, '<BR/>'),
					{wordwrap: process.stdout.columns}
				)+'\n');
				onComplete(body);
			}
		);
	}

	function saveCookies(cookieJar) {
		var cookieString = cookieJar.getCookieString(conf.baseUrl);
		fs.writeFile(conf.cookieFileName, cookieString, function(err) {
			if (err) { logFatal(err); }
		});
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

})();
