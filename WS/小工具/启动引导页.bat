@echo off
chcp 65001 >nul
setlocal EnableExtensions
title 创意工作台 · 启动引导页

rem ============================================================
rem  双击本文件即可：自动探测是否已有服务在跑 -> 有就直接开页面，
rem  没有就用 Python 起 serve.py（serve.py 会自己打开浏览器）。
rem  本脚本不写任何文件。
rem ============================================================

set "HERE=%~dp0"
if "%HERE:~-1%"=="\" set "HERE=%HERE:~0,-1%"

rem ---- 1. 选择 Python 解释器（按顺序取第一个存在的）----
set "PY="
if exist "D:\IMA\python311\python.exe" set "PY=D:\IMA\python311\python.exe"
if not defined PY if exist "D:\IMA\pythoncore-3.14-64\python.exe" set "PY=D:\IMA\pythoncore-3.14-64\python.exe"
if not defined PY (
  for /f "delims=" %%P in ('where python 2^>nul') do (
    if not defined PY (
      echo %%P | findstr /i "WindowsApps" >nul || set "PY=%%P"
    )
  )
)
if not defined PY (
  echo [错误] 没有找到可用的 Python 解释器。
  echo        请先安装 Python 3，或用记事本打开本文件，把 PY 变量改成本机 python.exe 的完整路径。
  echo.
  pause
  exit /b 1
)

if not exist "%HERE%\serve.py" (
  echo [错误] 同目录下找不到 serve.py，请确认本文件与 serve.py、index.html 放在同一个文件夹。
  echo        当前目录：%HERE%
  echo.
  pause
  exit /b 1
)

rem ---- 2. 探测 8765-8785 是否已有本服务在运行 ----
set "LIVE="
for /f "usebackq delims=" %%A in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=0; foreach($port in 8765..8785){ try{ $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 -Uri ('http://127.0.0.1:'+$port+'/__ping'); if($r.StatusCode -eq 200 -and $r.Content -match 'launchpad'){ $p=$port; break } }catch{} }; if($p -gt 0){ $p }" 2^>nul`) do set "LIVE=%%A"

if defined LIVE (
  echo 服务已在运行：http://127.0.0.1:%LIVE%/index.html
  echo 直接打开页面，不重复启动新进程。
  start "" "http://127.0.0.1:%LIVE%/index.html"
  exit /b 0
)

rem ---- 3. 启动服务（serve.py 内部会自动用默认浏览器打开页面）----
echo 未检测到运行中的服务，正在启动：
echo   解释器：%PY%
echo   服务目录：%HERE%
echo   若弹出 Windows 防火墙提示，请选「取消」——本服务只监听 127.0.0.1，不需要放行。
echo.

"%PY%" "%HERE%\serve.py"
set "RC=%ERRORLEVEL%"

if not "%RC%"=="0" (
  echo.
  echo 服务异常退出（返回码 %RC%），请查看上方提示。
  pause
)
exit /b %RC%
