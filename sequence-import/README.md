# Sequence Data Import Tool

This tool allows you to import data from CSV files into your Sequence API instance.

## Prerequisites

- Docker installed on your system
- CSV file with the following columns:
  - domain
  - desktop_score
  - mobile_score
  - email_address
  - email_name
  - batch_id
  - response

## Setup

1. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

2. Add your Sequence API token to the `.env` file:
```
SEQUENCE_API_TOKEN=your_api_token_here
```

## Building the Docker Image

Build the Docker image from the project directory:

```bash
docker build -t sequence-import .
```

## Running the Import

To import data from your CSV file, use the following command:

```bash
# For Linux/Unix systems
docker run --network="host" \
  -v $(pwd)/your_file.csv:/app/data/input.csv \
  --env-file .env \
  -e API_URL=http://localhost:3000 \
  sequence-import --input /app/data/input.csv

# For Windows (PowerShell)
docker run --network="host" `
  -v ${PWD}/your_file.csv:/app/data/input.csv `
  --env-file .env `
  -e API_URL=http://localhost:3000 `
  sequence-import --input /app/data/input.csv
```

Replace `your_file.csv` with the path to your CSV file.

### Command Explanation

- `--network="host"`: Allows the container to access localhost
- `-v $(pwd)/your_file.csv:/app/data/input.csv`: Mounts your CSV file into the container
- `--env-file .env`: Loads environment variables from .env file
- `-e API_URL=http://localhost:3000`: Sets the API URL (default is localhost:3000)

## CSV Format

Your CSV file should follow this format:

```csv
domain,desktop_score,mobile_score,email_address,email_name,batch_id,response
example.com,85,72,user@example.com,John,BATCH123,
```

## Troubleshooting

1. If you get connection errors, verify:
   - The Sequence API is running and accessible
   - Your API token is correct in the .env file
   - The API_URL is correct for your setup

2. For CSV errors, ensure:
   - All required columns are present
   - The CSV file is properly formatted
   - There are no special characters in the column headers

## Example Usage

Using the provided test_accounts.csv:

```bash
docker run --network="host" \
  -v $(pwd)/test_accounts.csv:/app/data/input.csv \
  --env-file .env \
  -e API_URL=http://localhost:3000 \
  sequence-import --input /app/data/input.csv
```

The script will:
1. Validate the CSV format
2. Connect to the Sequence API
3. Process records in batches
4. Display progress and any errors
5. Confirm successful import 