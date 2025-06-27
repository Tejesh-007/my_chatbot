#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Step 1: Run the data ingestion script
echo "--- Running database ingestion ---"
python ingest.py

# Step 2: Start the Gunicorn server
# This will now correctly use the $PORT variable provided by Koyeb.
echo "--- Starting Gunicorn server on port $PORT ---"
gunicorn --worker-class gthread --workers 1 --threads 4 --timeout 120 app:app --bind 0.0.0.0:$PORT