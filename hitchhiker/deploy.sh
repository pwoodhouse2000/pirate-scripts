#!/usr/bin/env bash
# Deploy the game to Google Cloud Run as a static nginx container.
# Usage: PROJECT=my-gcp-project ./deploy.sh
# Optional: REGION=us-central1 SERVICE=dont-panic
#           GCP_SA_KEY='<service account JSON>'  (used to authenticate when no gcloud login exists)
set -euo pipefail
cd "$(dirname "$0")"
: "${PROJECT:?Set PROJECT to your GCP project ID}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-dont-panic}"
if [ -n "${GCP_SA_KEY:-}" ]; then
  KEYFILE="$(mktemp)"; trap 'rm -f "$KEYFILE"' EXIT
  printf '%s' "$GCP_SA_KEY" > "$KEYFILE"
  gcloud auth activate-service-account --key-file="$KEYFILE" --quiet
fi
gcloud config set project "$PROJECT" >/dev/null
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com --quiet
gcloud run deploy "$SERVICE" --source . --region "$REGION" --allow-unauthenticated --quiet
echo "Deployed: $(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"
