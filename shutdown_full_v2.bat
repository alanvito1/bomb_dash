@echo off
set "GCP_PATH=C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
set PROJECTS=sodium-terrain-469415-c4 bomb-dash-web3 bsc-analytics
set REGION=us-central1

echo ------------------------------------------------
echo SHUTTING DOWN BOMBDASH CLOUD INFRASTRUCTURE
echo ------------------------------------------------

for %%p in (%PROJECTS%) do (
    echo.
    echo Processing Project: %%p
    
    echo Pausing Cloud Scheduler jobs...
    call "%GCP_PATH%" scheduler jobs pause bomb-dash-matchmaking --project=%%p --location=%REGION% --quiet
    call "%GCP_PATH%" scheduler jobs pause bomb-dash-sync-staking --project=%%p --location=%REGION% --quiet
    call "%GCP_PATH%" scheduler jobs pause bomb-dash-rewards --project=%%p --location=%REGION% --quiet

    echo Deleting Cloud Run service...
    call "%GCP_PATH%" run services delete bomb-dash-backend --project=%%p --region=%REGION% --quiet
)

echo.
echo SHUTDOWN COMPLETE
pause
