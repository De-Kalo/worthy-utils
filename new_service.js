const yargs = require('yargs/yargs')
const { execSync } = require('child_process')
const colors = require('colors')
const { hideBin } = require('yargs/helpers')

const readline = require("readline");

const argv = yargs(hideBin(process.argv)).argv

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const settingsQuestions = [{
		key: 'appName',
		question: 'Please provide a name for the new app'
	},
	{
		key: 'pipelineName',
		question: 'Please provide the name of the pipeline (if required)',
	},
	{
		key: 'githubRepo',
		question: 'Please provide the github repo (Org/Repo name)',
	},
	{
		key: 'copyEnvAppName',
		question: 'Please provide an app name to copy environment variables from',
	},
	{
		key: 'targetEnv',
		question: 'Please enter the target env of the app (london/demo/qa/staging/production)',
		validOptions: ['london', 'demo', 'qa', 'staging', 'production']
	}
]

const settings = {}

async function getUserInput(text) {
	return new Promise((resolve, reject) => {
		rl.question(colors.cyan(`${text}: `), function(response) {
			resolve(response)
		});
	})
}

async function yesNoQuestion(question) {
	let answer = await getUserInput(`${question} (y/n/yes/no)`)
	while (!['n','y','no','yes'].includes(answer.toLowerCase())) {
		console.log('-- invalid answer'.red)
		answer = await getUserInput(`${question} (y/n/yes/no)`)
	}
	return ['y','yes'].includes(answer)
}

async function askSettingsQuestion(key, question, validOptions, target) {
	let answer = await getUserInput(question)
	while (validOptions && !validOptions.includes(answer) && !(answer === '' && target[key])) {
		console.log('-- invalid answer'.red)
		answer = await getUserInput(question)
	}
	if (typeof target[`set-${key}`] == 'function') {
		target[`set-${key}`](answer)
	} else {
		target[key] = answer ? answer : target[key]
	}
}

async function createHerokuApp() {
	// check if app exists.
	console.log(colors.yellow(`\n--- Checking if app ${settings.appName} already exists`))
	let exists = true
	try { execSync(`heroku apps:info -a ${settings.appName}`, {stdio : 'pipe' }) }
	catch { exists = false }
	if (exists) {
		if (!(await yesNoQuestion(`App ${settings.appName} already exists. Due you wish to continue setup on an existing app?`))) {
			console.log('Aborting by user request'.white)
			process.exit(0)
		}
	} else {
		console.log(colors.magenta(`\n--- Creating app ${settings.appName}`))
		execSync(`heroku apps:create ${settings.appName} --team ipawn --region us --buildpack https://github.com/heroku/heroku-buildpack-nodejs.git`)
	}
	
	const buildpack = 'https://buildpack-registry.s3.amazonaws.com/buildpacks/heroku-community/cli.tgz'
	try {
		console.log(colors.magenta('\n--- Verifying cli buildpack')) 
		execSync(`heroku buildpacks:add ${buildpack} -a ${settings.appName}`, { stdio: 'pipe' })
		console.log('Cli buildpack added'.green)
	}
	catch { 
		console.log(colors.white('Cli buildpack already exists'.green))
	}
	
	console.log('\n ---Setting authorization key'.magenta)
	const authDetails = JSON.parse(execSync('heroku authorizations -j').toString())
		.find((auth) => auth.description === "Heroku CLI")
	
	let token
	try { token = authDetails.access_token.token }
	catch (e) { token = await getUserInput('Please enter a valid token for the HEROKU_API_KEY env var')}
	execSync(`heroku config:set HEROKU_API_KEY=${token} -a ${settings.appName}`)

	console.log('\n--- Enabling heroku labs runtime dyno metadata'.magenta)
	execSync(`heroku labs:enable runtime-dyno-metadata -a ${settings.appName}`)

	const addonsApp = settings.targetEnv === 'production' ? 'worthy-segment' : `worthy-segment-${settings.targetEnv}`
	// expect the first line to be:
	// '=== ADDON_NAME'
	const coralogix = execSync(`heroku addons:info CORALOGIX -a ${addonsApp}`)
		.toString().split('\n')[0].split(' ')[1]
	console.log(`\n--- Attaching coralogix ${coralogix}`.magenta)
	try { execSync(`heroku addons:attach ${coralogix} -a ${settings.appName}`) }
	catch { console.log('coralgix already connected.'.green)}

	console.log(`\n--- Setting coralogix key in env vars`.magenta)
	const CORALOGIX_KEY=execSync(`heroku config:get CORALOGIX_PRIVATE_KEY -a ${addonsApp}`)
		.toString().split('\n')[0]
	console.log(CORALOGIX_KEY)
	execSync(`heroku config:set CORALOGIX_PRIVATE_KEY=${CORALOGIX_KEY} -a ${settings.appName}`)

	console.log(`\n--- Setting NPM_TOKEN key in env vars`.magenta)
	const NPM_TOKEN=execSync(`heroku config:get NPM_TOKEN -a ${addonsApp}`)
	.toString().split('\n')[0]
	execSync(`heroku config:set NPM_TOKEN=${NPM_TOKEN} -a ${settings.appName}`)

	const kafka = execSync(`heroku addons:info KAFKA -a ${addonsApp}`)
		.toString().split('\n')[0].split(' ')[1]
	console.log(`\n--- Checking for kafka ${kafka}`.yellow)
	let addonData 
	try { addonData = execSync(`heroku addons:info KAFKA -a ${settings.appName}`).toString() } catch {}
	if (addonData) {
		console.log('Kafka already attached'.green)
	} else {
		console.log(`--- Attaching kafka ${kafka}`.magenta)
		execSync(`heroku addons:attach ${kafka} -a ${settings.appName}`)
	}
	
	console.log('\n--- Checking for rollbar'.yellow)
	try { 
		execSync(`heroku addons:info ROLLBAR -a ${settings.appName}`, { stdio: 'pipe'}).toString() 
		console.log('Rollbar addon already exists'.green)
	}
	catch {
		console.log('--- Attaching free rollbar addon'.magenta)
		execSync(`heroku addons:create rollbar:trial-5k -a ${settings.appName}`)
	}

	let stage = settings.targetEnv === 'production' ? 'prod' : 'qa'
	console.log(`\n--- Setting STAGE to '${stage}'`.magenta)
	execSync(`heroku config:set STAGE=${stage} -a ${settings.appName}`)

	console.log(`\n--- Setting ENV to '${settings.targetEnv}'`.magenta)
	execSync(`heroku config:set ENV=${settings.targetEnv} -a ${settings.appName}`)

	console.log(`\n--- Enabling node specific metrics`.magenta)
	execSync(`heroku labs:enable "runtime-heroku-metrics" -a ${settings.appName}`)
	execSync(`heroku labs:enable "nodejs-language-metrics" -a ${settings.appName}`)
}


async function pipelineAssignment() {
	if (!settings.pipelineName) {
		console.log('No pipeline requested'.yellow)
	}

	console.log('\n--- Checking if pipeline exists'.yellow)
	let pipelineData
	try { pipelineData = JSON.parse(execSync(`heroku pipelines:info ${settings.pipelineName} --json`, { stdio: 'pipe'}).toString())} catch {}

	const targetStage = settings.targetStage || 'development'

	if (!pipelineData) {
		console.log(`--- Creating pipeline ${settings.pipelineName}`.magenta)
		execSync(`heroku pipelines:create ${settings.pipelineName} --team ipawn --stage staging -a ${settings.appName}`)
	} else {
		console.log(`Pipeline ${settings.pipelineName} already exists`.green)

		if (pipelineData.apps.find((app) => app.name === settings.appName)) {
			console.log(`\n--- Placing app ${settings.appName} in the ${targetStage} stage of pipeline ${settings.pipelineName}`.magenta)
			execSync(`heroku pipelines:update -a ${settings.appName} -s ${targetStage}`)
		} else {
			console.log(`\n--- Adding app ${settings.appName} in the ${targetStage} stage of pipeline ${settings.pipelineName}`.magenta)
			execSync(`heroku pipelines:add ${settings.pipelineName} -a ${settings.appName} -s ${targetStage}`)
		}
	}


	console.log(`\n--- Attempting to connect pipeline to github repo ${settings.githubRepo}`.magenta)
	console.log(`Note: this operation can fail if the repo is already connected.`.gray)
	try{ execSync(`heroku pipelines:connect ${settings.pipelineName} -r ${settings.githubRepo}`)}
	catch{}
}

async function copyEnvVars() {
	const excludePrefixes = [
		'HEROKU',
		'MONGO',
		'KAFKA_',
		'ROLLBAR',
		'ENV',
		'STAGE'
	]

	// get all env vars from copy app
	if (!settings.copyEnvAppName) return

	console.log(`\n--- Getting environment vars to copy from ${settings.copyEnvAppName}`.yellow)
	const myEnv = JSON.parse(execSync(`heroku config -a ${settings.appName} -j`).toString())
	const copyEnv = JSON.parse(execSync(`heroku config -a ${settings.copyEnvAppName} -j`).toString())

	for (const key of Object.keys(copyEnv)) {
		// skip keys we shouldn't copy
		if (myEnv[key]) continue
		if (excludePrefixes.find((pfx) => key.startsWith(pfx))) continue
		console.log(`--- Copying ${key}`.magenta)
		execSync(`heroku config:set ${key}='${copyEnv[key]}' -a ${settings.appName}`)
	}
}

async function fillSettings() {
	for (desc of settingsQuestions) {
		let question = desc.question
		if (argv[desc.key]) {
			settings[desc.key] = argv[desc.key]
			question = `${question} (${settings[desc.key]})`
		}
		await askSettingsQuestion(desc.key, question, desc.validOptions, settings)
	}
	console.log(settings)
	console.log('\nPlease review the settings above. Ctrl+C to restart..')
	await getUserInput('press any key to continue')
}

function endCredits() {
	console.log(`\n\n\nFinished setting up '${settings.appName}' in heroku!`.green)
	console.log('\nBut! that is not all there is to it...'.yellow)
	console.log('The following action items are required:\n'.yellow)
	console.log('\t1. If needed - setup ssl and a subdomain.'.cyan)
	console.log('\t2. DB connection - create a db and add the connection string env var.'.cyan)
	console.log('\t3. When all is set - add dynos :-).'.cyan)
}

async function launchNewService() {
	console.log('\nNew micro service creation utility'.green)
	console.log('----------------------------------\n'.green)
	console.log('Please answer the following questions:\n'.yellow)
	await fillSettings()

	await createHerokuApp()

	await pipelineAssignment()

	await copyEnvVars()
	
	rl.close()

	endCredits()
}

launchNewService()