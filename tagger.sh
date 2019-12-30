#!/bin/bash 

# first fetch so that tags will be updated.
git fetch
# get latest tag 
tag=$(git log --decorate --oneline | grep "tag:" | head -n 1 | sed -E 's/[a-f0-9]{7,12} \(.*tag: ([0-9]{1,3}\.[0-9]{1,3}(\.[0-9]{1,4}){0,1}).*\).*/\1/')
# get latest commit message
message=$(git log  --pretty=format:'%s')

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

