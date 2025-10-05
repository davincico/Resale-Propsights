# Main repo for Deployment to AWS 

## List of components

**Frontend Infrastructure**
1. 2 S3 buckets
2. Cloudfront
3. TLS certificates
4. Custom domain (Namecheap)

**Web app**
1. React Files

**Backend**
1. API gateway
2. Lambda
   1. ETL - For pulling data.gov to S3 (Processed data)
   2. React App - For querying S3 with processed data to React App
3. S3 with processed data