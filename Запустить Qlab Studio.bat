@echo off
chcp 65001 >nul
title Qlab Studio — Онлайн Сервер
echo ==============================================================
echo     Запуск сервера Qlab Studio для Ноутбука, Телефона и Планшета
echo ==============================================================
timeout /t 1 >nul
start http://localhost:3000
node "%~dp0qlab_server.js"
pause
