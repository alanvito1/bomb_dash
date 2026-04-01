#!/bin/bash

# BOMBDASH CLOUD SHUTDOWN SCRIPT
# This script disables the GCP resources to stop recurring costs.

PROJECT_ID="sodium-terrain-469415-c4"
REGION="us-central1"

echo "------------------------------------------------"
echo "🚀 SHUTTING DOWN BOMBDASH CLOUD COMPUTER"
echo "------------------------------------------------"

# 1. Pause Cloud Scheduler Jobs (The biggest cause of 'Wake Up' costs)
echo "⏸️ Pausing Cloud Scheduler jobs..."
gcloud scheduler jobs pause bomb-dash-matchmaking --project=$PROJECT_ID --location=$REGION --quiet
gcloud scheduler jobs pause bomb-dash-sync-staking --project=$PROJECT_ID --location=$REGION --quiet
gcloud scheduler jobs pause bomb-dash-rewards --project=$PROJECT_ID --location=$REGION --quiet

# 2. Delete Cloud Run Backend (Ensures no execution costs)
# If you prefer to only stop traffic, you can also just delete the service.
echo "🗑️ Deleting Cloud Run service: bomb-dash-backend..."
gcloud run services delete bomb-dash-backend --project=$PROJECT_ID --region=$REGION --quiet

echo "------------------------------------------------"
echo "✅ SHUTDOWN COMPLETE"
echo "------------------------------------------------"
echo "NOTE: Remember to check your Supabase and Vercel dashboards manually"
echo "      to ensure no 'Pro' plans are active if you want zero cost."
echo "------------------------------------------------"
