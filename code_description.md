## frontend folder (adopted from Jing Hui)
This folder contains the frontend code for the Resale Propsights application. It is a Vite + React project that provides an interactive user interface with free and premium features for users to explore resale property data and make predictions.

## predict lambda folder
This folder contains files for compiling a lambda function which serves the prediction API for the frontend application.
Structure:
```
predict-lambda/
├── samconfig.toml
├── template.yaml
└── predict/
    ├── app.py
    ├── requirements.txt
    ├── dockerfile
    ├── xgb_model.json
    └── categorical_info.json
```

- `samconfig.toml` - Configuration file for AWS SAM CLI.
- `template.yaml` - AWS SAM template defining the Lambda function and its properties.
- `predict/app.py` - Python code for the Lambda function that handles prediction requests.
- `predict/requirements.txt` - List of Python dependencies required by the Lambda function.
- `predict/dockerfile` - Dockerfile for building the Lambda function container image on AWS ECR.
- `predict/xgb_model.json` - Pre-trained XGBoost model used for making predictions.
- `predict/categorical_info.json` - JSON file containing categorical feature mappings used in the model.


## interactive plot lambda folder
This folder contains files for compiling a lambda function which takes user query and compute housing statistics on demand.
Structure:
```
interactive-plot-lambda/
├── samconfig.toml
├── template.yaml
└── fetch_data/
    ├── app.py
    └── requirements.txt
```

- `samconfig.toml` - Configuration file for AWS SAM CLI.
- `template.yaml` - AWS SAM template defining the Lambda function and its properties.
- `fetch_data/app.py` - Python code for the Lambda function that processes user queries and computes housing statistics.
- `fetch_data/requirements.txt` - List of Python dependencies required by the Lambda function

## train.ipynb
This Jupyter notebook contains the code for training a XGBoost model to predict resale property prices based on various features.
