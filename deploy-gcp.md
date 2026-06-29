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

## Automated Deployment with GitHub Actions

A automated CI/CD pipeline has been configured in [.github/workflows/deploy.yml](file:///.github/workflows/deploy.yml). It will build the Docker container and deploy it to Cloud Run automatically whenever you push code changes to the `master` branch.

### Setup Instructions for GitHub Actions:

#### 1. Create a Google Cloud Service Account
Create a dedicated Service Account for GitHub Actions to authenticate:
```bash
gcloud iam service-accounts create github-deployer \
    --description="CI/CD Service Account for GitHub Actions" \
    --display-name="GitHub Deployer"
```

#### 2. Grant Required IAM Permissions
Run the following commands to grant the necessary permissions so that the pipeline can push images and update Cloud Run:
```bash
# Set your active project ID env variable
PROJECT_ID=$(gcloud config get-value project)

# 1. Allow service account to manage Cloud Run services
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-deployer@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.admin"

# 2. Allow service account to upload container images to Artifact Registry
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-deployer@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.writer"

# 3. Allow service account to use the default Compute Engine service account to run the service
gcloud iam service-accounts add-iam-policy-binding \
    $PROJECT_ID-compute@developer.gserviceaccount.com \
    --member="serviceAccount:github-deployer@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"
```

#### 3. Generate Service Account Key JSON
Create and download a private key for the service account:
```bash
gcloud iam service-accounts keys create key.json \
    --iam-account=github-deployer@$PROJECT_ID.iam.gserviceaccount.com
```

#### 4. Configure GitHub Repository Secrets
Go to your GitHub repository: **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret** and add the following two secrets:
1. `GCP_PROJECT_ID`: Your Google Cloud Project ID (e.g. `civiverse-123456`).
2. `GCP_SA_KEY`: Paste the complete contents of the downloaded `key.json` file.

*Make sure to delete the local `key.json` file once added to GitHub secrets to prevent committing it to source control!*

---

## Serverless Scaling & Cost Optimization
Google Cloud Run scales down to **zero instances** when there is no traffic. This means you will incur **zero charges** unless citizens are actively using the application.

*For persistent, multi-instance data storage (instead of the default local JSON files in `data/`), swap the storage read/write calls in `backend/db.py` to use a cloud database like Google Cloud Firestore or Google Cloud SQL (Postgres).*
