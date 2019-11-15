@echo off
cd dist
echo fm.peratx.net > CNAME

git init
git add -A
git commit -m "Deploy to GitHub Pages"
git push -f https://github.com/iTXTech/FlashMaster.git master:gh-pages

cd ..
