import json
import pandas as pd
import xgboost as xgb
import os
from datetime import datetime
from io import StringIO

# s3 = boto3.client('s3')

MODEL_PATH = os.path.join(os.path.dirname(__file__), "xgb_model.json")
CATINFO_PATH = os.path.join(os.path.dirname(__file__), "categorical_info.json")
model = xgb.XGBRegressor()
model.load_model(MODEL_PATH)

# INPUT_BUCKET = "resalehouse"
# INPUT_KEY = "input/data.csv"
# OUTPUT_KEY = "predictions/data_predicted.csv"
storey_range = ['01 TO 03', '04 TO 06', '07 TO 09', '10 TO 12', '13 TO 15', '16 TO 18', '19 TO 21', '22 TO 24', '25 TO 27', '28 TO 30', '31 TO 33', '34 TO 36', '37 TO 39', '40 TO 42', '43 TO 45', '46 TO 48', '49 TO 51']
flat_type = ['1 ROOM', '2 ROOM', '3 ROOM', '4 ROOM', '5 ROOM', 'EXECUTIVE', 'MULTI-GENERATION']
def lambda_handler(event, context):

    if event.get('httpMethod') == 'OPTIONS':
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS, POST",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": json.dumps({"message": "CORS preflight"})
        }
    try:
        body = event.get("body")
        if body:
            params = json.loads(body)  # parse JSON
        else:
            params = {}
        
        # Extract the input features
        flat_type_str = params.get('flat_type')
        storey_range_str = params.get('storey_range')
        remaining_lease_numeric = params.get('remaining_lease_numeric')
        floor_area_sqm = params.get('floor_area_sqm')
        flat_model = params.get('flat_model')
        town = params.get('town')
        
        # Validate required parameters
        if None in [flat_type_str, storey_range_str, remaining_lease_numeric, floor_area_sqm, flat_model, town]:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Missing required parameters'})
            }
        if flat_type_str not in flat_type:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': f'Invalid flat_type: {flat_type_str}'})
            }
        if storey_range_str not in storey_range:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': f'Invalid storey_range: {storey_range_str}'})
            }
        
        flat_type_code = flat_type.index(flat_type_str)
        storey_range_code = storey_range.index(storey_range_str)
        
        # Load category info
        with open(CATINFO_PATH, 'r') as f:
            cat_info = json.load(f)
        
        # Get current year
        current_year = int(datetime.now().year)
        
        # Create 5 rows for subsequent years
        data = []
        for i in range(5):
            year = current_year + i
            # Calculate remaining lease for each year (decrease by 1 each year)
            remaining_lease = float(remaining_lease_numeric) - i
            
            data.append({
                'flat_type_code': flat_type_code,
                'storey_range_code': storey_range_code,
                'remaining_lease_numeric': remaining_lease,
                'floor_area_sqm': floor_area_sqm,
                'flat_model': flat_model,
                'town': town,
                'year': year
            })
        
        # Create DataFrame
        X = pd.DataFrame(data)
        
        # Convert categorical columns
        X['flat_model'] = pd.Categorical(X['flat_model'], categories=cat_info['flat_model'])
        X['town'] = pd.Categorical(X['town'], categories=cat_info['town'])
        
        # Make predictions
        preds = model.predict(X)

        
        return {
            "statusCode": 200,
            "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS, POST",
            "Access-Control-Allow-Headers": "Content-Type",
        },
            "body": json.dumps({
                "data": preds.tolist()
            })
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }