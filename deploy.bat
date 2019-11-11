@echo off
cd dist

git init
git add -A
git commit -m 'deploy'
git push -f https://github.com/iTXTech/FlashMaster.git master:gh-pages

cd ..
