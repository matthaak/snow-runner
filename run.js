const {promisify} = require('util');
const getCookies = promisify(require('chrome-cookies-secure').getCookies);
const chokidar = require('chokidar');
const readFile = promisify(require('fs').readFile);
const got = require('got');

const config = require('.bg-config.json') || {};
const argv = require('minimist')(process.argv.slice(2));
// let [ , , instance, dirpath, scopeName ] = process.argv;

const dirpath = argv._[1] || '.';
const instance = config.instance || argv.i || argv.instance;
const scopeName = config.scope || argv.s || argv.scope || 'global';

if (!instance)
	die('Usage:\n' +
		'   node /path/to/run.js instance [directory] [scope]\n' +
		'Example:\n' +
		'   node /path/to/run.js demo001\n' +
		'   snow-runner will watch the current working directory (.) and\n' +
		'   its sub-directories for new or updated .bg.js files then\n' +
		'   execute them on demo001 in the global scope.\n' +
		'Optionally, supply a directory (e.g. bg_scripts) as in:\n' +
		'   node /path/to/run.js demo001 bg_scripts\n' +
		'Optionally, supply a scope (e.g. x_pfx_myapp) as in:\n' +
		'   node /path/to/run.js demo001 . x_pfx_myapp');

// dirpath = dirpath || '.';
const baseUrl = 'https://' + instance + '.service-now.com/';

(async () => {
	try {
		const cookieJar = await getCookies(baseUrl, 'jar');

		chokidar.watch(dirpath, {ignoreInitial:true}).on('all', async (event, filepath) => {
			// Only watch for added or changed files ending with .bg.js extension
			if ((event !== 'add' && event !== 'change') || !filepath.endsWith('.bg.js')) return;

			console.log('*** Executed ' + filepath + ' at ' + getTimeOfDay() + ' ***');

			let script = await readFile(filepath);

			let response = await got(baseUrl + 'sys.scripts.do', {cookieJar, followRedirect: false});
			if (response.statusCode !== 200)
				die('ERROR: Could not load sys.scripts.do.\n' +
					'You must be logged into ' + instance + ' as an admin in Chrome and be able ' +
					'to run background scripts. In some instances, this requires elevation.\n' +
					'NOTE: On Mac Chrome, wait at least 30 seconds after logging in before starting snow-runner.');

			let ckm = response.body.match(/name="sysparm_ck" type="hidden" value="([a-f0-9]+)"/);
			if (!ckm)
				die('ERROR: Unrecognized page returned when loading sys.scripts.do.');
			let sysparm_ck = ckm[1];

			let sys_scope = getScopeOptionValue(response.body);
			if (!sys_scope)
				die('ERROR: Scope \'' + scopeName + '\' not recognized in sys.scripts.do form.');

			response = await got.post(baseUrl + 'sys.scripts.do', {
				cookieJar,
				form : { script, sysparm_ck, sys_scope, runscript : 'Run script' }
			});
			console.log(getScriptResult(response.body) + '\n');
			// console.log(response.body);
		});

	} catch (error) {
		console.log(error);
	}
})();

function getTimeOfDay() {
	let d = new Date();
	return pad(d.getHours()) + ':' +
		pad(d.getMinutes()) + ':' +
		pad(d.getSeconds());

	function pad(i) {
		return i < 10 ? "0" + i : i;
	}
}

function getScopeOptionValue(body) {
	let match = body.match(new RegExp("<option value=\"([a-f0-9]+)\">" + scopeName + "</option>"));
	if (match) return match[1];
	// In Fuji the option value for global is a sys_id, in Helsinki (and Geneva?) it is 'global'
	// so the regex above fails to match. If we wanted global scope, return 'global'
	if (scopeName === 'global') return 'global';
}

function getScriptResult(body) {
	let match = body.match(/<HR\/><PRE>\*\*\* Script: ([\s\S]*?)<BR\/><\/PRE><HR\/><\/BODY><\/HTML>/);
	return match[1].replace(/<BR\/>\*\*\* Script: /g, '\n');
}

function die(msg, exitCode) {
	console.log(msg);
	process.exit(exitCode === undefined ? 1 : exitCode);
}
