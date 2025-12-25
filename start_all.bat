@echo off
echo Starting EtsyGame Project...

start cmd /k "cd backend && npm run dev"
start cmd /k "cd backend && npm run worker"
start cmd /k "cd frontend && npm run dev"

echo.
echo All services started in separate windows!
echo - Backend API (Port 3001)
echo - Worker (Background Job)
echo - Frontend (Port 3000)
echo.
echo Go to http://localhost:3000 to use the app.
echo Admin Login: admin@example.com / admin123
pause

