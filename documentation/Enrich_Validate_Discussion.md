
# Lambda Function and React Integration Discussion

### Key Topics Discussed:
1. Debugging and updating Lambda function to handle API calls (Endato and Kount).
2. React form creation for API interaction.
3. Implementing CORS in the Lambda function.
4. Storing and transforming data for API responses.

---

### Final Lambda Function with CORS Implementation
```python
import json
import os
import requests
import logging
import boto3
from datetime import datetime

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# DynamoDB client and table
dynamodb = boto3.client('dynamodb')
TABLE_NAME = "EnrichValidateResponses"

# Environment variables
ENDATO_PROFILE_KEY = os.getenv("ENDATO_PROFILE_KEY")
ENDATO_PROFILE_PASSWORD = os.getenv("ENDATO_PROFILE_PASSWORD")
KOUNT_CLIENT_SECRET = os.getenv("KOUNT_CLIENT_SECRET")
KOUNT_CLIENT_ID = os.getenv("KOUNT_CLIENT_ID")

# API Endpoints
ENDATO_URL = "https://devapi.endato.com/Contact/Enrich"
KOUNT_AUTH_URL = "https://login.kount.com/oauth2/ausdppksgrbyM0abp357/v1/token"
KOUNT_INPUT_VALIDATION_URL = "https://api.kount.com/identity/evaluate/v2"

def lambda_handler(event, context):
    aws_request_id = context.aws_request_id
    logger.info("AWS Request ID: %s", aws_request_id)

    try:
        body = json.loads(event.get("body", "{}"))
        first_name = body.get("FirstName")
        last_name = body.get("LastName")
        phone = body.get("Phone")
        email = body.get("Email")
        address = body.get("Address")

        if not first_name and not last_name and not phone and not email and not address:
            return {
                "statusCode": 400,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST"
                },
                "body": json.dumps({"error": "Missing required fields"})
            }

        endato_headers = {
            "Content-Type": "application/json",
            "accept": "application/json",
            "galaxy-ap-name": ENDATO_PROFILE_KEY,
            "galaxy-ap-password": ENDATO_PROFILE_PASSWORD,
            "galaxy-search-type": "DevAPIContactEnrich"
        }
        endato_payload = {
            "FirstName": first_name,
            "LastName": last_name,
            "Phone": phone,
            "Email": email,
            "Address": address
        }
        endato_response = requests.post(ENDATO_URL, headers=endato_headers, json=endato_payload)
        endato_data = endato_response.json() if endato_response.status_code == 200 else None

        if not endato_data:
            logger.error("Endato API failed: %s", endato_response.text)
            return {
                "statusCode": endato_response.status_code,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST"
                },
                "body": endato_response.text
            }

        dynamodb.put_item(
            TableName=TABLE_NAME,
            Item={
                "requestID": {"S": aws_request_id},
                "rawEndatoData": {"S": json.dumps(endato_data)}
            }
        )

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST"
            },
            "body": json.dumps({
                "requestID": aws_request_id,
                "restructuredEndatoData": endato_data
            })
        }

    except Exception as e:
        logger.error("Error occurred: %s", str(e), exc_info=True)
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST"
            },
            "body": json.dumps({"error": "An error occurred", "details": str(e)})
        }
```

---

### React Component for API Call
```javascript
import React, { useState } from "react";

const API_URL = "https://8zb4x5d8q4.execute-api.us-east-2.amazonaws.com/SandBox/enrichandvalidate";

const EnrichValidateForm = () => {
  const [formData, setFormData] = useState({
    FirstName: "",
    LastName: "",
    Phone: "",
    Email: "",
    Address: {
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      zip: ""
    }
  });

  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name in formData.Address) {
      setFormData((prevData) => ({
        ...prevData,
        Address: {
          ...prevData.Address,
          [name]: value
        }
      }));
    } else {
      setFormData((prevData) => ({
        ...prevData,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setResponse(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Enrich and Validate</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>First Name:</label>
          <input
            type="text"
            name="FirstName"
            value={formData.FirstName}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Last Name:</label>
          <input
            type="text"
            name="LastName"
            value={formData.LastName}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Phone:</label>
          <input
            type="tel"
            name="Phone"
            value={formData.Phone}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Email:</label>
          <input
            type="email"
            name="Email"
            value={formData.Email}
            onChange={handleChange}
          />
        </div>
        <h3>Address</h3>
        <div>
          <label>Address Line 1:</label>
          <input
            type="text"
            name="addressLine1"
            value={formData.Address.addressLine1}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Address Line 2:</label>
          <input
            type="text"
            name="addressLine2"
            value={formData.Address.addressLine2}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>City:</label>
          <input
            type="text"
            name="city"
            value={formData.Address.city}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>State:</label>
          <input
            type="text"
            name="state"
            value={formData.Address.state}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>ZIP:</label>
          <input
            type="text"
            name="zip"
            value={formData.Address.zip}
            onChange={handleChange}
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Loading..." : "Submit"}
        </button>
      </form>

      {response && (
        <div>
          <h2>Response:</h2>
          <pre>{JSON.stringify(response, null, 2)}</pre>
        </div>
      )}

      {error && (
        <div>
          <h2>Error:</h2>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default EnrichValidateForm;
```
