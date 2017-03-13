#!/bin/bash

set -o errexit -o nounset

if [ "$TRAVIS_BRANCH" != "master" ]
then
  echo "This commit was made against the $TRAVIS_BRANCH and not the master! No deploy!"
  exit 0
fi

rev=$(git rev-parse --short HEAD)

mkdir pages
cd pages

git init
git config user.name "Matt Munson"
git config user.email "munson@dh.uni-leipzig.de"

git remote add upstream "https://$GITPERM@github.com/sonofmun/First1KGreek.git"
git fetch upstream
git reset upstream/gh-pages

pwd

python3 /home/travis/build/sonofmun/First1KGreek/pages/github_pages.py --url_base https://raw.githubusercontent.com/OpenGreekAndLatin/First1KGreek/master/data

touch .

git add -A .
git commit -m "rebuild pages at ${rev}"
git push -q upstream HEAD:gh-pages