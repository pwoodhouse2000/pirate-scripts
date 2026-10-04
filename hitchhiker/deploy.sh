#!/usr/bin/env bash
# Deploy the game to Google Cloud Run as a static nginx container.
# Usage: PROJECT=my-gcp-project ./deploy.sh   (optional: REGION=europe-west2 SERVICE=dont-panic)
set -euo pipefail
cd "$(dirname "$0")"
: "${PROJECT:?Set PROJECT to your GCP project ID}"
REGION="${REGION:-europe-west2}"
SERVICE="${SERVICE:-dont-panic}"
gcloud config set project "$PROJECT" >/dev/null
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com --quiet
gcloud run deploy "$SERVICE" --source . --region "$REGION" --allow-unauthenticated --quiet
gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)'
