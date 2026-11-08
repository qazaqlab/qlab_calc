@echo off
chcp 65001 >nul
title Отправка Qlab Studio на GitHub
echo ====================================================================
echo      ОТПРАВКА ПРОЕКТА В РЕПОЗИТОРИЙ GITHUB
echo      https://github.com/qazaqlab/qlab_calc.git
echo ====================================================================
echo.
cd /d "%~dp0"
if not exist ".git" (
    git init
    git branch -M main
    git remote add origin https://github.com/qazaqlab/qlab_calc.git
    git config user.name "qazaqlab"
    git config user.email "qazaqlab@gmail.com"
)
git add .
git commit -m "feat: Qlab Studio 3D calculator, CRM and multi-device sync"
echo.
echo Отправка в ветку main...
git push -u origin main
echo.
echo ====================================================================
echo Проверьте репозиторий: https://github.com/qazaqlab/qlab_calc
echo В настройках репозитория: Settings -> Pages -> Deploy from branch (main)
echo Ваша онлайн ссылка: https://qazaqlab.github.io/qlab_calc/
echo ====================================================================
pause
