# Define base URL and headers
$baseUrl = "http://localhost:5000"
$headers = @{ "Content-Type" = "application/json" }

# Define test email
$email = "s1transitioncontact@gmail.com"

# Function to check current credits
function Check-Credits {
    $response = Invoke-RestMethod -Uri "$baseUrl/check-credits" -Method POST -Headers $headers -Body (@{ email = $email } | ConvertTo-Json)
    Write-Host "Credits before operation: $($response.credits)"
    return $response.credits
}

# Function to use a search
function Use-Search {
    param (
        [string]$operation
    )

    # Define payload for the API call
    $payload = @{
        email = $email
        searchQuery = @{
            operation = $operation
            firstName = "Brady"
            lastName = "Grimm"
            addressLine1 = "2989 N Waterbrook AVe"
            city = "Star"
            state = "ID"
            zip = "83669"
            email = "bradygrimm20@gmail.com"
            phone = ""
        }
    }

    # Make the API call
    $response = Invoke-RestMethod -Uri "$baseUrl/use-search" -Method POST -Headers $headers -Body ($payload | ConvertTo-Json -Depth 10)
    Write-Host "Operation: $operation"
    Write-Host "Message: $($response.message)"
    Write-Host "Remaining Credits: $($response.remainingCredits)"
    Write-Host "Logged Data: $($response.data)"
    return $response.remainingCredits
}

# Test each operation and verify credits deduction
function Test-Credits-Deduction {
    # Initial check of credits
    $initialCredits = Check-Credits

    # Perform 'validate' operation (2 credits)
    $remainingCredits = Use-Search -operation "validate"
    if ($remainingCredits -ne ($initialCredits - 2)) {
        Write-Error "Credits deduction mismatch for 'validate'."
    }

    # Perform 'enrich' operation (2 credits)
    $initialCredits = $remainingCredits
    $remainingCredits = Use-Search -operation "enrich"
    if ($remainingCredits -ne ($initialCredits - 2)) {
        Write-Error "Credits deduction mismatch for 'enrich'."
    }

    # Perform 'validate_and_enrich' operation (3 credits)
    $initialCredits = $remainingCredits
    $remainingCredits = Use-Search -operation "validate_and_enrich"
    if ($remainingCredits -ne ($initialCredits - 3)) {
        Write-Error "Credits deduction mismatch for 'validate_and_enrich'."
    }

    Write-Host "All tests completed successfully!"
}

# Run the test
Test-Credits-Deduction
