@echo off
if exist "%~dp0..\private\postgres-data\postmaster.pid" del /f "%~dp0..\private\postgres-data\postmaster.pid"
"C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" -D "%~dp0..\private\postgres-data" -l "%~dp0..\private\postgres.log" start
