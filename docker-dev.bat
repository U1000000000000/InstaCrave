@echo off
REM ============================================
REM InstaCrave Docker Development Scripts (Windows)
REM ============================================

setlocal enabledelayedexpansion

if "%1"=="" goto :help
if "%1"=="help" goto :help
if "%1"=="-h" goto :help
if "%1"=="--help" goto :help

if "%1"=="up" goto :up
if "%1"=="down" goto :down
if "%1"=="restart" goto :restart
if "%1"=="logs" goto :logs
if "%1"=="rebuild" goto :rebuild
if "%1"=="clean" goto :clean
if "%1"=="exec" goto :exec
if "%1"=="test" goto :test
if "%1"=="mongo" goto :mongo
if "%1"=="redis" goto :redis
if "%1"=="health" goto :health
if "%1"=="stats" goto :stats

echo Unknown command: %1
goto :help

:up
echo [INFO] Starting InstaCrave development environment...
docker-compose up -d
echo [INFO] Services started!
echo [INFO] Frontend: http://localhost:5173
echo [INFO] Backend: http://localhost:3000
echo [INFO] API Docs: http://localhost:3000/docs
docker-compose ps
goto :eof

:down
echo [INFO] Stopping InstaCrave development environment...
docker-compose down
echo [INFO] Services stopped!
goto :eof

:restart
echo [INFO] Restarting InstaCrave development environment...
docker-compose restart
echo [INFO] Services restarted!
goto :eof

:logs
if "%2"=="" (
    docker-compose logs -f
) else (
    docker-compose logs -f %2
)
goto :eof

:rebuild
echo [INFO] Rebuilding services...
if "%2"=="" (
    docker-compose up --build -d
) else (
    docker-compose up --build -d %2
)
echo [INFO] Rebuild complete!
goto :eof

:clean
echo [WARN] This will remove all data (MongoDB, Redis)!
set /p confirm="Are you sure? (yes/no): "
if "%confirm%"=="yes" (
    echo [INFO] Cleaning up...
    docker-compose down -v
    docker system prune -f
    echo [INFO] Cleanup complete!
) else (
    echo [INFO] Cleanup cancelled.
)
goto :eof

:exec
if "%2"=="" (
    echo [ERROR] Usage: docker-dev.bat exec ^<service^> ^<command^>
    exit /b 1
)
docker-compose exec %2 %3 %4 %5 %6 %7 %8 %9
goto :eof

:test
echo [INFO] Running tests in backend container...
docker-compose exec backend npm test
goto :eof

:mongo
echo [INFO] Accessing MongoDB shell...
docker-compose exec mongodb mongosh -u admin -p admin123 instacrave
goto :eof

:redis
echo [INFO] Accessing Redis CLI...
docker-compose exec redis redis-cli -a redis123
goto :eof

:health
echo [INFO] Checking service health...
echo.
echo === Docker Compose Services ===
docker-compose ps
echo.
echo === Backend Health ===
curl -s http://localhost:3000/health
echo.
echo === Frontend Health ===
curl -s http://localhost:5173
goto :eof

:stats
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
goto :eof

:help
echo InstaCrave Docker Development Scripts (Windows)
echo.
echo Usage: docker-dev.bat ^<command^>
echo.
echo Commands:
echo   up              Start all services
echo   down            Stop all services
echo   restart         Restart all services
echo   logs [service]  View logs (optional: specify service)
echo   rebuild [svc]   Rebuild and restart (optional: specify service)
echo   clean           Stop and remove all data (destructive)
echo   exec ^<svc^> ^<cmd^> Execute command in container
echo   test            Run backend tests
echo   mongo           Access MongoDB shell
echo   redis           Access Redis CLI
echo   health          Check service health
echo   stats           View resource usage
echo   help            Show this help
echo.
echo Examples:
echo   docker-dev.bat up
echo   docker-dev.bat logs backend
echo   docker-dev.bat rebuild backend
echo   docker-dev.bat exec backend npm install express
echo   docker-dev.bat test
echo.
goto :eof
