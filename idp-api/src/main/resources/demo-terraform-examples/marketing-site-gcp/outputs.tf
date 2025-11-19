output "bucket_name" {
  description = "Name of the Cloud Storage bucket"
  value       = google_storage_bucket.website.name
}

output "bucket_url" {
  description = "URL of the Cloud Storage bucket"
  value       = google_storage_bucket.website.url
}

output "cdn_ip_address" {
  description = "IP address of the CDN"
  value       = google_compute_global_address.website.address
}

output "website_url" {
  description = "URL of the website"
  value       = "http://${google_compute_global_address.website.address}"
}
