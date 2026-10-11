@echo off
title SpendWise - Expense Tracker
echo ===== Installing backend =====
cd backend
call npm install
echo ===== Installing + building frontend =====
cd ..\frontend
call npm install
call npm run build
echo ===== Starting SpendWise on http://localhost:5000 =====
cd ..\backend
start "" http://localhost:5000
node server.js
pause
