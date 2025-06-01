Write-Host "Cleaning Django project..." -ForegroundColor Green

# 1. Remove all __pycache__ directories
Write-Host "Removing __pycache__ directories..." -ForegroundColor Yellow
Get-ChildItem -Path . -Include "__pycache__" -Recurse -Directory | Remove-Item -Recurse -Force
Write-Host "Done removing __pycache__ directories" -ForegroundColor Green

# 2. Remove all migration files except __init__.py
Write-Host "Removing migration files..." -ForegroundColor Yellow
$migrationDirs = @(
    "accounts\migrations",
    "authentication\migrations",
    "checkins\migrations",
    "invoices\migrations",
    "members\migrations",
    "plans\migrations",
    "reports\migrations"
)

foreach ($dir in $migrationDirs) {
    if (Test-Path $dir) {
        Get-ChildItem -Path $dir -Exclude "__init__.py" | Remove-Item -Force
        Write-Host "Cleaned migrations in $dir" -ForegroundColor Cyan
    }
}
Write-Host "Done removing migration files" -ForegroundColor Green

# 3. Remove SQLite database
Write-Host "Removing SQLite database..." -ForegroundColor Yellow
if (Test-Path "db.sqlite3") {
    Remove-Item "db.sqlite3" -Force
    Write-Host "Removed db.sqlite3" -ForegroundColor Cyan
}
Write-Host "Done removing SQLite database" -ForegroundColor Green

# 4. Remove .pyc files
Write-Host "Removing .pyc files..." -ForegroundColor Yellow
Get-ChildItem -Path . -Include "*.pyc" -Recurse | Remove-Item -Force
Write-Host "Done removing .pyc files" -ForegroundColor Green

Write-Host "Project cleanup complete!" -ForegroundColor Green
Write-Host "You can now recreate your virtual environment and run migrations from scratch." -ForegroundColor Green
