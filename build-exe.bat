@echo off
setlocal enabledelayedexpansion

:: Ensure we run from the folder where this batch file lives
cd /d "%~dp0"

echo ========================================================
echo        Amit CRM - Windows .EXE Desktop Builder
echo ========================================================
echo.

:: 1. Verify that project files exist in this folder
if not exist "package.json" (
    echo [ERROR] package.json NOT FOUND IN THIS DIRECTORY!
    echo Current folder: %CD%
    echo.
    echo It looks like you downloaded only 'build-exe.bat' without the project files.
    echo To compile Amit CRM into an .EXE locally, this file must reside inside the
    echo project root directory alongside package.json, src\, and src-tauri\.
    echo.
    echo HOW TO FIX:
    echo 1. In Amit CRM Settings (or top-bar), click "Download Complete Project (ZIP)".
    echo 2. Extract that ZIP into this folder: %CD%
    echo 3. Run build-exe.bat again!
    echo.
    echo OR USE THE RECOMMENDED 100%% FREE GITHUB ACTIONS BUILDER:
    echo You don't need to install Node or Rust on your PC!
    echo Follow the steps in Settings > Desktop Executable (.exe) to push to a private
    echo GitHub repo. GitHub will compile the .EXE for you in 3 minutes!
    echo.
    pause
    exit /b 1
)

:: 2. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js (v20+ LTS) from https://nodejs.org/
    echo.
    echo (Alternatively, use GitHub Actions which builds the .EXE in the cloud for free).
    pause
    exit /b 1
)

:: 3. Check Rust / Cargo
where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] Rust / Cargo was not found in your system PATH.
    echo Tauri requires the Rust toolchain to compile native Windows .exe binaries.
    echo.
    echo To build locally:
    echo 1. Install Rust: https://rustup.rs/
    echo 2. Install "Desktop development with C++" via the Visual Studio Installer.
    echo.
    echo NOTE: If you do not want to install Rust on your computer, push this
    echo project to a free PRIVATE GitHub repository. GitHub Actions will build
    echo the .EXE automatically! See Settings > Desktop Executable (.exe).
    echo.
    set /p CONTINUE="Try building anyway? (y/n): "
    if /i "!CONTINUE!" neq "y" exit /b 1
)

echo [1/3] Installing frontend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b %errorlevel%
)

echo [2/3] Compiling React frontend with Vite...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed.
    pause
    exit /b %errorlevel%
)

echo [3/3] Compiling Tauri v2 Windows .EXE with local SQLite...
call npm run tauri:build
if %errorlevel% neq 0 (
    echo [ERROR] Tauri build failed. Check error output above.
    pause
    exit /b %errorlevel%
)

echo.
echo ========================================================
echo   SUCCESS! Amit CRM .exe has been successfully built!
echo ========================================================
echo.
echo Executable location:
echo   src-tauri\target\release\amit-crm.exe
echo   src-tauri\target\release\bundle\nsis\
echo.
if exist "src-tauri\target\release\bundle\nsis" (
    explorer "src-tauri\target\release\bundle\nsis"
) else if exist "src-tauri\target\release" (
    explorer "src-tauri\target\release"
)

pause
