#!/bin/bash -x

git fetch
tag=$(git log --decorate --oneline | grep "tag:" | head -n 1 | sed -E 's/[a-f0-9]{7,8} \(.*tag: ([0-9]{1,3}\.[0-9]{1,3}(\.[0-9]{1,4}){0,1}).*\).*/\1/')
message=$(git log  --pretty=format:'%s')

IFS='.' # space is set as delimiter
read -ra verpart <<< "$tag"
IFS=''

MAJOR=${verpart[0]}
MINOR=${verpart[1]}

arraylen=${#verpart[@]}

PATCH=0
if (( arraylen > 2 )); then
  PATCH=${verpart[2]}
fi

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

