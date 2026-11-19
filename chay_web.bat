@echo off
REM Khoi dong backend va frontend cua Lumi Beauty
REM MySQL khong can bat vi da chay san nhu dich vu Windows

start "Backend - Flask" cmd /k "cd /d %~dp0backend && .venv\Scripts\python.exe app.py"
start "Frontend - Vite" cmd /k "cd /d %~dp0frontend && npm run dev"

REM Lan dau chay, Vite can them thoi gian de nen thu vien (khoang 10 giay).
REM Trong luc do no da mo cong nhung CHUA tra loi duoc, nen phai goi thu
REM bang curl cho den khi co phan hoi that su roi moi mo trinh duyet.
echo Dang cho server khoi dong, vui long doi...
:cho_server
timeout /t 2 >nul
curl -s -o nul -m 3 http://localhost:5173/
if errorlevel 1 goto cho_server

echo San sang. Dang mo trinh duyet...
start http://localhost:5173
