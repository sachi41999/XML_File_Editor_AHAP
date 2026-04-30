# ============================================================
# XML Claim Editor - GitHub Auto Push Script
# Run this from INSIDE the xml-claim-editor folder
# ============================================================

# -----------------------------------------------------------
# STEP 1: FILL IN YOUR DETAILS BELOW
# -----------------------------------------------------------

$GITHUB_USERNAME = "sachi41999"       # e.g. "john-doe"
$GITHUB_PAT      = "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" # e.g. "ghp_xxxxxxxxxxxx"
$REPO_NAME       = "XML_File_Editor_AHAP"

# -----------------------------------------------------------
# DO NOT EDIT BELOW THIS LINE
# -----------------------------------------------------------

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  XML Claim Editor - GitHub Push Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Validate inputs
if ($GITHUB_USERNAME -eq "YOUR_GITHUB_USERNAME" -or $GITHUB_PAT -eq "YOUR_PERSONAL_ACCESS_TOKEN") {
    Write-Host "ERROR: Please open this script and fill in your GitHub username and PAT token first." -ForegroundColor Red
    Write-Host "       Open push-to-github.ps1 in Notepad, replace the placeholder values, then run again." -ForegroundColor Yellow
    pause
    exit 1
}

# Build the remote URL with PAT embedded (no password prompt)
$REMOTE_URL = "https://$($GITHUB_USERNAME):$($GITHUB_PAT)@github.com/$($GITHUB_USERNAME)/$($REPO_NAME).git"

Write-Host "Step 1: Initializing git repository..." -ForegroundColor Green
git init
if ($LASTEXITCODE -ne 0) { Write-Host "Git init failed. Is git installed?" -ForegroundColor Red; pause; exit 1 }

Write-Host ""
Write-Host "Step 2: Staging all files..." -ForegroundColor Green
git add .

Write-Host ""
Write-Host "Step 3: Creating initial commit..." -ForegroundColor Green
git commit -m "feat: XML Claim Editor - Angular 19 with Azure AD auth, validations, search & bulk replace"
if ($LASTEXITCODE -ne 0) { Write-Host "Commit failed." -ForegroundColor Red; pause; exit 1 }

Write-Host ""
Write-Host "Step 4: Setting branch to main..." -ForegroundColor Green
git branch -M main

Write-Host ""
Write-Host "Step 5: Adding remote origin..." -ForegroundColor Green
git remote remove origin 2>$null  # remove if already exists
git remote add origin $REMOTE_URL

Write-Host ""
Write-Host "Step 6: Pushing to GitHub..." -ForegroundColor Green
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  SUCCESS! Code pushed to GitHub." -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your repo URL:" -ForegroundColor Cyan
    Write-Host "  https://github.com/$GITHUB_USERNAME/$REPO_NAME" -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Go to your repo on GitHub" -ForegroundColor White
    Write-Host "  2. Settings -> Collaborators -> Add people" -ForegroundColor White
    Write-Host "  3. Enter your QA member's GitHub username" -ForegroundColor White
    Write-Host "  4. Set role to 'Read' and send invitation" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "PUSH FAILED. Common causes:" -ForegroundColor Red
    Write-Host "  - Repository does not exist on GitHub yet" -ForegroundColor Yellow
    Write-Host "    -> Go to github.com/new and create '$REPO_NAME' first" -ForegroundColor White
    Write-Host "  - Wrong username or PAT token" -ForegroundColor Yellow
    Write-Host "    -> Check your PAT has 'repo' scope enabled" -ForegroundColor White
    Write-Host "  - PAT expired" -ForegroundColor Yellow
    Write-Host "    -> Generate a new one at GitHub -> Settings -> Developer settings" -ForegroundColor White
}

pause
