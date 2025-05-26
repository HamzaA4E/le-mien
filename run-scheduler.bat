@echo off
cd /d %~dp0
php artisan tickets:deadline-reminder >> scheduler_output.log 2>&1 