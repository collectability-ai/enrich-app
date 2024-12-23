# Script to automate Git commit, push, and versioning to the development branch

# Set version number and description
$version = "v1.8.4-restore"
$description = "Restore point: fixed signup and login issues, centralized Amplify configuration"

# Add all changes
git add .

# Commit with the provided description
git commit -m "${version}: ${description}"

# Tag the commit with the version number
git tag -a $version -m "Restore point ${version}: ${description}"

# Push the commit and tag to the development branch
git push origin development
git push origin $version

Write-Host "Successfully pushed changes and created tag $version on the development branch"
