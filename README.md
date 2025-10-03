# Resale-Propsights
---
AWS Hosted Web app for Realtors, Real estate buyers and sellers - Making housing price data transparent and actionable

### Overview
HDB flats constitute the majority of Singapore’s housing stock, and the resale market plays a crucial role in shaping affordability, property investment decisions, and housing policies. Recognizing the public’s strong interest in HDB market analytics, we present PropSight - The HDB Lens, a cloud-based Software-as-a-Service (SaaS) platform designed to analyze HDB resale prices.

## Intro
---
We will be using this repo as staging area for our test web app files and other notes.

One of the simplest sample I found was for React App on S3, we can try to model after this for minimal viable product before adding other features:
https://github.com/qnlzgl/CS5224-PIA?tab=readme-ov-file

### Group Members
- Amos Kwok Chun Fung
- Davin Hong Hao Yang
- Tay Kar Hwee
- Teo Pei Sheng Nicholas
- Yew Jing Hui

### Working with the Branches
Main branch is for the finalized code deployment.

Development branch for each member, you can upload all your testing files and code to your branch:
- davin_dev
- jinghui_dev
- karhwee_dev
- nicholas_dev
- amos_dev


We will review the code and perform integration weekly.



### 1. Preparing your branch
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

### 2. Pushing to the repository 
3 steps have to be performed to push changes to github:
```python
git add .
git commit -m "update the xxx file to include yyy"
git push origin <your_branch_name> # Example - git push origin davin_dev
# What this does is it pushes your local code changes on your computer to Github online on YOUR BRANCH

```
