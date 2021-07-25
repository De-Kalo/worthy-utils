# worthy-utils
The place to put various simple utils that may be needed across repositories.

# Utilities
## Tagger
The file [tagger.sh](https://github.com/De-Kalo/worthy-utils/blob/master/tagger.sh) expects to be run in a folder that has a git repository. When run, it will find the latest version tag (major.minor.patch), create a new tag with an updated version, and push it to remote.   
**Usage:**   
* `tagger.sh` - will update a minor version (2.3.4 -> 2.4.0)
* `tagger.sh --major` - will update major version (2.3.4 -> 3.0.0)
* `tagger.sh --patch` - will update patch (2.3.4 -> 2.3.5)

## Replacing environment variables in Heroku apps
The file [replaceEnvVars.js](https://github.com/De-Kalo/worthy-utils/blob/master/replaceEnvVars.js) file expects to get the following arguments:   
* `--var` - the name of the environment variable to replace across all heroku apps.
* `--old` - the old value of the environment variable
* `--new` - the new value to set for the environment variable

Example usage:   
```
node ./replaceEnvVars.js --var NPM_TOKEN --old '1234' --new '2345'
```   

The above will go through all of the heroku applications in our team, and in each application look for the environment variable named 'NPM_TOKEN'. If the current value of'NPM_TOKEN' is '1234' - it will change it to '2345'

**Note**: The user running the script must be logged in to heroku and have sufficient privileges to perform said operations via the heroku cli.


## Creating a new node service in heroku
This script helps us create a new app in heroku, based on the parameters we set.   
Features:
* Creates a heroku application (if it doesn't exist)
* Creates a heroku pipeline (if doesn't exist yet) and adds the requested application to a specific stage in the pipeline.
* Attaches a github repository to the pipeline / application.
* Attaches relevant plugins:
  * Kafka (based on stage)
  * Coralogix (based on stage)
  * Rollbar (free account)
* Copies app-specific environment variables from a different app (e.g. if you're creating a london app and already have a qa app - you can ask to copy the env variables)

**Usage**:   
You can run the application without any arguments, and the script will ask relevant questions to fill in the setup parameters. However, you can also set the parameters in the command line as in the following example:
```
node ./new_service.js --appName worthy-segment-london --targetEnv london --pipelineName worthy-segment --githubRepo De-Kalo/segment --copyEnvAppName worthy-segment-qa
```
The example above creates a new application `worthy-segment-london`, defines the target environment as `london`, asks to connect it to the `worthy-segment` pipeline, and connect it to the `De-Kalo/segment` repository. It also requests to copy app specific environment variables from the `worthy-segment-qa` app.