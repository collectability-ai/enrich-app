# Script to automate Git commit, push, and versioning

# Set version number and description
$version = "v1.1.6"
$description = "Integrated Cognito. Rebuilt base functionality."

# Add all changes
git add .

# Commit with the provided description
git commit -m "${version}: ${description}"

# Tag the commit with the version number
git tag -a $version -m "Release ${version}: ${description}"

# Push the commit and tag to the repository
git push origin main
git push origin $version

Write-Host "Successfully pushed changes and created tag $version"
