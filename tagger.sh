#!/bin/bash

# This file does the following:
#  1. git fetch
#  2. get's the last tag in the repository - assuming the tag is called x.y.z (major.minor.patch)
#  3. creates a new tag based on the input
#  3.1 by default creates a new minor version
#  3.2 if the file is run with the '--patch' argument - creates a new patch version.
#  3.3 if the file is run with the '--major' argument - creates a new major version.
#
# This file can be run 'directly' from the web by using the following command:
# curl -s -H 'Cache-Control: no-cache' https://raw.githubusercontent.com/De-Kalo/worthy-utils/master/tagger.sh | bash -s
# or with arguments:
# curl -s -H 'Cache-Control: no-cache' https://raw.githubusercontent.com/De-Kalo/worthy-utils/master/tagger.sh | bash -s -- --patch

# first fetch so that tags will be updated.
git fetch
# get latest tag
tag=$(git log --decorate --oneline -n1000| grep "tag:" | head -n 1 | sed -E 's/[a-f0-9]{7,12} \(.*tag: ([0-9]{1,3}\.[0-9]{1,3}(\.[0-9]{1,4}){0,1}).*\).*/\1/')
# get latest commit message
message=$(git log -n1 --pretty=format:'%s')

# split tag tp array using separator '.'
IFS='.' # space is set as delimiter
read -ra verpart <<< "$tag"
IFS=''

# get major and minor
MAJOR=${verpart[0]}
MINOR=${verpart[1]}

arraylen=${#verpart[@]}

# get patch
PATCH=0
if (( arraylen > 2 )); then
  PATCH=${verpart[2]}
fi

# increment correct part of the version according to user request.
if [ "$1" == "--major" ] ; then
   MAJOR=$((MAJOR+1))
   MINOR=0
   PATCH=0
elif [ "$1" == "--patch" ] ; then
   PATCH=$((PATCH+1))
else
   MINOR=$((MINOR+1))
   PATCH=0
fi

newTag="$MAJOR.$MINOR.$PATCH"
git tag -a $newTag -m \"${message}\"
git push origin $newTag

