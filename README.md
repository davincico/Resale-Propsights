# Resale-Propsights
---
AWS Hosted Web app for Realtors, Real estate buyers and sellers - Making housing price data transparent and actionable.

### Overview
HDB flats constitute the majority of Singapore’s housing stock, and the resale market plays a crucial role in shaping affordability, property investment decisions, and housing policies. Recognizing the public’s strong interest in HDB market analytics, we present PropSight - The HDB Lens, a cloud-based Software-as-a-Service (SaaS) platform designed to analyze HDB resale prices.

### Group Members
- Amos Kwok Chun Fung
- Davin Hong Hao Yang
- Tay Kar Hwee
- Teo Pei Sheng Nicholas
- Yew Jing Hui

## Intro
---
In the current Singaporean public housing market, access to clear and synthesized resale flats’ pricing data may be difficult. This "information gap" can manifest as challenges for resale buyers and realtors. 

The application is hosted on S3 bucket static hosting for speed and cost, while an API Gateway and Lambda pair exposes lightweight JSON aggregates so the user can filter by town, price range, month and remaining lease. There are two versions of the app: free and premium.

Free version:
![alt text](images/image-1.png)

Premium version:
![alt text](images/image-2.png)

Price forecast using custom proprietary algorithms:
![alt text](images/image-3.png)

### AWS Architecture
![alt text](images/image.png)

List of resources:
- React Web App
- API Gateways
- S3
- Cloudfront
- Lambda & Event Bridge
- Glue for ETL


Cloudfront distribution with custom SSL certificate for HTTPS enforcement:
![alt text](images/image-4.png)

AWS Certificate Manager custom SSL certificate with dedicated CNAME records:
![alt text](images/image-5.png)

To utilize a professional domain for our business, we purchased a custom domain from namecheap. CNAME records for propsights.site are configured to point towards the AWS Cloudfront Distribution:
![alt text](images/image-6.png)

Using two S3 buckets:
1. Static hosting the site files (www.propsights.site)
![alt text](images/image-7.png)
2. Second S3 Bucket (propsights.site) serves as Redirector 
![alt text](images/image-8.png)

#### 1. Preparing your branch
Preparing to work on your branch:
```python
# First clone the repository
git clone https://github.com/davincico/Resale-Propsights.git
cd Resale-Propsights

# Check the branch you are in
git branch

# Switch to your own branch
git checkout -b <your_branch_name>
git checkout -b davin_dev # example

# Confirm you are on your own branch
git branch

```

#### 2. Pushing to the repository 

```python
git add .
git commit -m "update the xxx file to include yyy"
git push origin <your_branch_name> # Example - git push origin davin_dev
# What this does is it pushes your local code changes on your computer to Github online on YOUR BRANCH

```

### Code Structure
---


