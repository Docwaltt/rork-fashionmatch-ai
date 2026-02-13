import requests
import json

api_key = "AIzaSyAsfMZBuhfiBfX2xXRyqcoULhxoKM64Rk0"
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"

response = requests.get(url)
if response.status_code == 200:
    models = response.json().get('models', [])
    for model in models:
        print(f"Model ID: {model.get('name')}, Display Name: {model.get('displayName')}")
else:
    print(f"Error fetching models: {response.status_code}")
    print(response.text)
