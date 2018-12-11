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
git commit -m 'publish'
​
cd -