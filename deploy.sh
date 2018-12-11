#!/usr/bin/env sh
​
# abort on errors
set -e
​
# build
npm run publish
​
git init
git add -A
git commit -m 'deploy'
​git push -f https://${access_token}@github.com/<USERNAME>/<USERNAME>.github.io.git master

cd -