# Read from .env file and set environment variables
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.+)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        if ($name -eq "ACCESS_KEY_ID") {
            $env:AWS_ACCESS_KEY_ID = $value
        }
        elseif ($name -eq "SECRET_ACCESS_KEY") {
            $env:AWS_SECRET_ACCESS_KEY = $value
        }
        elseif ($name -eq "REGION") {
            $env:AWS_REGION = $value
        }
    }
}

# Log the values (optional, for debugging)
Write-Host "AWS_ACCESS_KEY_ID: $env:AWS_ACCESS_KEY_ID"
Write-Host "AWS_SECRET_ACCESS_KEY: $env:AWS_SECRET_ACCESS_KEY"
Write-Host "AWS_REGION: $env:AWS_REGION"

# Run the server
node server.js