const yargs = require('yargs/yargs')
const { execSync } = require('child_process')
const colors = require('colors')
const { hideBin } = require('yargs/helpers')

const argv = yargs(hideBin(process.argv)).argv

/**
 * This utility can go over all of our heroku apps and switch an environment variable with a specific name
 * and value to a new value.
 * usage:
 * node ./replaceEnvVars.js --var MY_VAR --old some_old_value --new some_new_value
 */

const envVar = argv.var
const oldVal = argv.old
const newVal = argv.new

console.log(`Replacing environment variable ${envVar} from value '${oldVal}' to new value '${newVal}'`.yellow)

// get all apps
const apps = execSync('heroku apps -t ipawn | grep -v ===').toString()
	.split('\n').map((app) => app.split(' ')[0].trim()).filter((app) => app !== '')

apps.forEach((app) => {
	console.log(`Processing ${app}`.gray)
	const appOldVal = execSync(`heroku config:get ${envVar} -a ${app}`).toString().trim()
	if (appOldVal === oldVal) {
		console.log(`Setting new value`.magenta)
		execSync(`heroku config:set ${envVar}=${newVal} -a ${app}`).toString().trim()
	}
})