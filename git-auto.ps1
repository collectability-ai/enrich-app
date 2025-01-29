# Script to automate Git commit, push, and versioning to the development branch

# Set version number and description
$version = "v2.3.2"
$description = "Added: T and C enhancements on signup page, API Access menu button, and API Developer Portal placeholderpage. All functional on localhost."

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
