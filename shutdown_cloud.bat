@echo off
set PROJECT_ID=sodium-terrain-469415-c4
set REGION=us-central1

echo ------------------------------------------------
echo SHUTTING DOWN BOMBDASH CLOUD COMPUTER
echo ------------------------------------------------

echo Pausing Cloud Scheduler jobs...
call "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" scheduler jobs pause bomb-dash-matchmaking --project=%PROJECT_ID% --location=%REGION% --quiet
call "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" scheduler jobs pause bomb-dash-sync-staking --project=%PROJECT_ID% --location=%REGION% --quiet
call "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" scheduler jobs pause bomb-dash-rewards --project=%PROJECT_ID% --location=%REGION% --quiet

echo Deleting Cloud Run service...
call "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" run services delete bomb-dash-backend --project=%PROJECT_ID% --region=%REGION% --quiet

echo ------------------------------------------------
echo SHUTDOWN COMPLETE
echo ------------------------------------------------
pause
