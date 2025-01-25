# Script to automate Git commit, push, and versioning to the development branch

# Set version number and description

$version = "v2.3.0"
$description = "Revamped Stripe Webhook handling to fix credit update process. Fixed Country Code error on results page. Following were tested as working on localhost: Promo code $0 payment, checkout session with no payment stored, add 2nd payment, purchase with existing payment, run search, display results. All functional on localhost."

# Add all changes
git add .

# Commit with the provided description
git commit -m "${version}: ${description}"

# Tag the commit with the version number
git tag -f $version -m "Release ${version}: ${description}"

# Push the commit and tag to the development branch
git push -f origin development
git push -f origin $version

Write-Host "Successfully pushed changes and created tag $version on the development branch"
