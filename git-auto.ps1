# Script to automate Git commit, push, and versioning to the development branch

# Set version number and description
$version = "v1.9.7"
$description = "API routes fixed for search history, get credits, use search. Localhost fully functional. Testing partially functional."

# Add all changes
git add .

# Commit with the provided description
git commit -m "${version}: ${description}"

# Tag the commit with the version number
git tag -a $version -m "Release ${version}: ${description}"

# Push the commit and tag to the development branch
git push origin development
git push origin $version

Write-Host "Successfully pushed changes and created tag $version on the development branch"
