# Marketing Website - Static Website on GCP Cloud Storage
# Generated for demo purposes - DO NOT DEPLOY

terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.gcp_project
  region  = var.gcp_region
}

# Cloud Storage Bucket for website
resource "google_storage_bucket" "website" {
  name          = "${var.stack_name}-website"
  location      = var.gcp_region
  force_destroy = true

  uniform_bucket_level_access = true

  website {
    main_page_suffix = "index.html"
    not_found_page   = "404.html"
  }

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
}

# Make bucket public
resource "google_storage_bucket_iam_member" "public_read" {
  bucket = google_storage_bucket.website.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# Cloud CDN Backend Bucket
resource "google_compute_backend_bucket" "website" {
  name        = "${var.stack_name}-backend"
  bucket_name = google_storage_bucket.website.name
  enable_cdn  = true

  cdn_policy {
    cache_mode        = "CACHE_ALL_STATIC"
    client_ttl        = 3600
    default_ttl       = 3600
    max_ttl           = 86400
    negative_caching  = true
    serve_while_stale = 86400
  }
}

# URL Map
resource "google_compute_url_map" "website" {
  name            = "${var.stack_name}-url-map"
  default_service = google_compute_backend_bucket.website.id
}

# HTTP Proxy
resource "google_compute_target_http_proxy" "website" {
  name    = "${var.stack_name}-http-proxy"
  url_map = google_compute_url_map.website.id
}

# Global Forwarding Rule
resource "google_compute_global_forwarding_rule" "website" {
  name       = "${var.stack_name}-forwarding-rule"
  target     = google_compute_target_http_proxy.website.id
  port_range = "80"
  ip_protocol = "TCP"
}

# Reserve static IP
resource "google_compute_global_address" "website" {
  name = "${var.stack_name}-ip"
}
