# Deployment Guide: Civiverse on Google Cloud Run

This guide outlines how to build, containerize, and deploy the Civiverse platform to **Google Cloud Run** using the `gcloud` Command Line Interface (CLI).

---

## Prerequisites

1. **Google Cloud SDK**: Install the Google Cloud CLI from [cloud.google.com/sdk](https://cloud.google.com/sdk).
2. **Docker**: Ensure Docker is installed and running on your local machine.
3. **Google Cloud Project**: Create a project in the Google Cloud Console.

---

## Step-by-Step Deployment Instructions

### 1. Initialize and Authenticate gcloud
Open your terminal (PowerShell, Bash, etc.) and run:
```bash
# Login to your Google Cloud account
gcloud auth login

# Set your active project ID
gcloud config set project [YOUR_PROJECT_ID]
```

### 2. Enable Required Google APIs
Enable the Artifact Registry and Cloud Run services in your project:
```bash
gcloud services enable artifactregistry.googleapis.com run.googleapis.com
```

### 3. Create a Google Artifact Registry Repository
Create a repository to store the Docker container images:
```bash
gcloud artifacts repositories create civiverse-repo \
    --repository-format=docker \
    --location=asia-south1 \
    --description="Civiverse Container Registry"
```
*(You can change `asia-south1` to your preferred region, e.g., `us-central1` or `europe-west1`)*

### 4. Authenticate Docker with Artifact Registry
Configure Docker to authorize pushes to the newly created registry:
```bash
gcloud auth configure-docker asia-south1-docker.pkg.dev
```

### 5. Build and Tag the Docker Container
Build the image locally and tag it with the Artifact Registry target URL:
```bash
# Build the Docker image
docker build -t civiverse:latest .

# Tag the image for Google Artifact Registry
docker tag civiverse:latest asia-south1-docker.pkg.dev/[YOUR_PROJECT_ID]/civiverse-repo/civiverse-app:latest
```

### 6. Push the Image to Google Cloud
Push your container up to Google Artifact Registry:
```bash
docker push asia-south1-docker.pkg.dev/[YOUR_PROJECT_ID]/civiverse-repo/civiverse-app:latest
```

### 7. Deploy to Google Cloud Run
Deploy the container to Cloud Run, permitting unauthenticated (public) access so that citizens can access it:
```bash
gcloud run deploy civiverse \
    --image=asia-south1-docker.pkg.dev/[YOUR_PROJECT_ID]/civiverse-repo/civiverse-app:latest \
    --region=asia-south1 \
    --allow-unauthenticated \
    --port=8080
```

Once deployment completes, the terminal will print a **Service URL** (e.g. `https://civiverse-xxxxx-xx.a.run.app`). Open this URL in your web browser to access the live dashboard!

---

## Serverless Scaling & Cost Optimization
Google Cloud Run scales down to **zero instances** when there is no traffic. This means you will incur **zero charges** unless citizens are actively using the application.

*For persistent, multi-instance data storage (instead of the default local JSON file), swap the storage layer in `server.js` with Google Cloud Firestore or Google Cloud SQL (Postgres).*
