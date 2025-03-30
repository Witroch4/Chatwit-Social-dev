@echo off
setlocal

echo Digite a mensagem do commit:
set /p commit_msg=

git add .
git commit -m "%commit_msg%"
git push origin master

echo.
echo Commit e push realizados com sucesso!
echo.

pause 