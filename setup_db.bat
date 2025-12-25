@echo off
cd backend
echo Installing dependencies...
call npm install

echo.
echo Setting up Database...
echo Please ensure your password in backend/.env is correct!
echo Current settings try to connect to: postgresql://postgres:postgres@localhost:5432/etsygame
echo.
call npx prisma db push

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Database Setup Failed. 
    echo Likely a password issue. Please check 'backend/.env' file.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Seeding Database...
call npm run seed

echo.
echo Setup Complete!
pause

