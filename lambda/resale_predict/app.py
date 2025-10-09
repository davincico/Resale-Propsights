import json
import boto3
import pandas as pd
import xgboost as xgb
import os
from io import StringIO

s3 = boto3.client('s3')

MODEL_PATH = os.path.join(os.path.dirname(__file__), "xgb_model.json")
CATINFO_PATH = os.path.join(os.path.dirname(__file__), "categorical_info.json")
model = xgb.XGBRegressor()
model.load_model(MODEL_PATH)

INPUT_BUCKET = "resalehouse"
INPUT_KEY = "input/data.csv"
# OUTPUT_KEY = "predictions/data_predicted.csv"

def lambda_handler(event, context):
    try:
        obj = s3.get_object(Bucket=INPUT_BUCKET, Key=INPUT_KEY)
        df = pd.read_csv(obj['Body'])

        with open(CATINFO_PATH, 'r') as f:
            cat_info = json.load(f)

        # Direct prediction
        X = df[['flat_type_code', 'storey_range_code', 'remaining_lease_numeric', 'floor_area_sqm', 'flat_model', 'town','year']]
        X['flat_model'] = pd.Categorical(X['flat_model'], categories=cat_info['flat_model'])
        X['town'] = pd.Categorical(X['town'], categories=cat_info['town'])
        preds = model.predict(X)
        df['predicted_resale_price'] = preds

        # out_csv = StringIO()
        # df.to_csv(out_csv, index=False)

        # s3.put_object(
        #     Bucket=INPUT_BUCKET,
        #     Key=OUTPUT_KEY,
        #     Body=out_csv.getvalue()
        # )
        output_data = dict()
        output_data['predictions'] = df['predicted_resale_price'].tolist()
        output_data['ground_truth'] = df['resale_price'].tolist()
        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "Prediction complete",
                "data": output_data
            })
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }