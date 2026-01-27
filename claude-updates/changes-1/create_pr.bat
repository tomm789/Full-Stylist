@echo off
REM ############################################
REM Outfit Refactoring - PR Creation Script (Windows)
REM ############################################

setlocal enabledelayedexpansion

set BRANCH_NAME=refactor/outfit-screens
set SOURCE_DIR=C:\path\to\outputs\app

echo ================================================
echo Outfit Refactoring - PR Creation Script
echo ================================================
echo.

REM Check if we're in a git repository
git rev-parse --git-dir >nul 2>&1
if errorlevel 1 (
    echo ERROR: Not a git repository
    echo Please run this script from your project root
    pause
    exit /b 1
)
echo [OK] Git repository detected
echo.

REM Check for uncommitted changes
git diff-index --quiet HEAD --
if errorlevel 1 (
    echo WARNING: You have uncommitted changes
    git status -s
    echo.
    set /p CONTINUE="Continue anyway? (y/n): "
    if /i not "!CONTINUE!"=="y" exit /b 0
)

REM Create new branch
echo Creating new branch: %BRANCH_NAME%
git checkout -b %BRANCH_NAME% 2>nul
if errorlevel 1 (
    echo Branch already exists. Switching to it...
    git checkout %BRANCH_NAME%
)
echo [OK] Branch ready
echo.

REM Create directories
echo Creating directories...
if not exist "app\hooks\outfits" mkdir "app\hooks\outfits"
if not exist "app\components\outfits" mkdir "app\components\outfits"
if not exist "app\components\shared\layout" mkdir "app\components\shared\layout"
if not exist "app\(tabs)" mkdir "app\(tabs)"
if not exist "app\outfits\[id]" mkdir "app\outfits\[id]"
echo [OK] Directories created
echo.

REM Copy files
echo Copying files...
echo NOTE: Update SOURCE_DIR at the top of this script to point to your outputs directory
echo Current SOURCE_DIR: %SOURCE_DIR%
echo.
set /p UPDATE_PATH="Update path now? (y/n): "
if /i "!UPDATE_PATH!"=="y" (
    set /p SOURCE_DIR="Enter full path to outputs/app directory: "
)

echo Copying outfit hooks...
xcopy /E /I /Y "%SOURCE_DIR%\hooks\outfits" "app\hooks\outfits"

echo Copying outfit components...
xcopy /E /I /Y "%SOURCE_DIR%\components\outfits" "app\components\outfits"

echo Copying ScheduleCalendar...
copy /Y "%SOURCE_DIR%\components\shared\layout\ScheduleCalendar.tsx" "app\components\shared\layout\"

echo Copying refactored screens...
copy /Y "%SOURCE_DIR%\(tabs)\outfits-refactored.tsx" "app\(tabs)\"
copy /Y "%SOURCE_DIR%\outfits\[id]-refactored.tsx" "app\outfits\"
copy /Y "%SOURCE_DIR%\outfits\[id]\view-refactored.tsx" "app\outfits\[id]\"
copy /Y "%SOURCE_DIR%\outfits\[id]\bundle-refactored.tsx" "app\outfits\[id]\"

echo [OK] Files copied
echo.

REM Add files to git
echo Adding files to git...
git add app/hooks/outfits/
git add app/components/outfits/
git add app/components/shared/layout/ScheduleCalendar.tsx
git add "app/(tabs)/outfits-refactored.tsx"
git add "app/outfits/[id]-refactored.tsx"
git add "app/outfits/[id]/view-refactored.tsx"
git add "app/outfits/[id]/bundle-refactored.tsx"
echo [OK] Files added
echo.

REM Show status
echo ================================================
echo Files to be committed:
echo ================================================
git status --short
echo.

REM Commit
set /p COMMIT="Commit these changes? (y/n): "
if /i not "!COMMIT!"=="y" (
    echo Changes not committed. You can commit manually.
    pause
    exit /b 0
)

git commit -m "refactor: Complete outfit section refactoring" -m "- Refactor all 4 outfit screens (48%% code reduction)" -m "- Add 4 new outfit hooks" -m "- Add 8 new outfit components" -m "- Add ScheduleCalendar shared component"
echo [OK] Changes committed
echo.

REM Push
set /p PUSH="Push to remote? (y/n): "
if /i not "!PUSH!"=="y" (
    echo Changes not pushed. You can push manually with:
    echo   git push -u origin %BRANCH_NAME%
    pause
    exit /b 0
)

git push -u origin %BRANCH_NAME%
echo [OK] Pushed to remote
echo.

echo ================================================
echo SUCCESS! Branch created and pushed
echo ================================================
echo.
echo Next steps:
echo 1. Go to your GitHub/GitLab repository
echo 2. Create a Pull Request for branch: %BRANCH_NAME%
echo 3. Use the PR template in PR_PACKAGE.md
echo.
echo PR Title:
echo refactor: Complete outfit section refactoring with 48%% code reduction
echo.
pause
