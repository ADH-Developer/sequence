#!/usr/bin/env python3

import argparse
import base64
import json
import logging
import os
import time
from typing import Dict, List, Optional

import pandas as pd
import requests
from dotenv import load_dotenv


class SequenceImporter:
    def __init__(self, csv_path: str, batch_size: int = 100):
        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        self.log = logging.getLogger("sequence_import")

        self.csv_path = csv_path
        self.batch_size = batch_size

        # Load API token and URL
        load_dotenv()
        self.api_token = os.getenv("SEQUENCE_API_TOKEN")
        if not self.api_token:
            raise ValueError("SEQUENCE_API_TOKEN environment variable is required")

        self.api_url = os.getenv("API_URL", "http://localhost:3000")
        self.log.info(f"Using API URL: {self.api_url}")

        # Setup API headers with properly encoded token
        encoded_token = base64.b64encode(f"{self.api_token}:".encode()).decode()
        self.headers = {
            "Authorization": f"Basic {encoded_token}",
            "Content-Type": "application/json",
        }

        # Verify connection before proceeding
        self.verify_connection()

    def verify_connection(self):
        """Test the API connection with an empty batch before starting the import."""
        try:
            self.log.info("Verifying API connection...")
            response = requests.post(
                f"{self.api_url}/event/batch",
                headers=self.headers,
                json={"batch": []},
                timeout=5,  # Add timeout to fail fast if server is not responding
            )

            if response.status_code == 200:
                self.log.info("API connection verified successfully")
            else:
                raise requests.exceptions.RequestException(
                    f"API connection test failed with status {response.status_code}: {response.text}"
                )
        except requests.exceptions.RequestException as e:
            self.log.error(f"Failed to connect to API: {str(e)}")
            self.log.error(f"Headers being used: {json.dumps(self.headers, indent=2)}")
            self.log.error(f"API URL being used: {self.api_url}")
            raise

    def process_row(self, row: pd.Series) -> Optional[Dict]:
        """Process a single row into a Sequence API format."""
        # Check if we have a valid email
        if not pd.notna(row["email_address"]) or not row["email_address"]:
            return None

        email = row["email_address"]
        name = row["email_name"] if pd.notna(row["email_name"]) else ""

        # Convert scores to integers if available
        try:
            desktop_score = (
                int(float(row["desktop_score"]))
                if pd.notna(row["desktop_score"])
                else None
            )
        except (ValueError, TypeError):
            desktop_score = None

        try:
            mobile_score = (
                int(float(row["mobile_score"]))
                if pd.notna(row["mobile_score"])
                else None
            )
        except (ValueError, TypeError):
            mobile_score = None

        # Keep batch_id as is, preserving the S/A suffix
        batch_id = str(row["batch_id"]) if pd.notna(row["batch_id"]) else None

        # Handle response field - blank or NaN is false, any value is true
        has_response = bool(row["response"]) if pd.notna(row["response"]) else False

        return {
            "type": "identify",
            "userId": email,
            "traits": {
                "firstName": name,
                "email": email,
                "domain": row["domain"],
                "desktop_score": desktop_score,
                "mobile_score": mobile_score,
                "batch_id": batch_id,
                "has_response": has_response,
            },
            "messageId": f"{email}_{int(time.time())}",
        }

    def send_batch(self, batch: List[Dict]) -> bool:
        """Send a batch of records to Sequence API."""
        try:
            # Debug log the data we're sending
            self.log.info(f"Sending batch data: {json.dumps(batch, indent=2)}")

            response = requests.post(
                f"{self.api_url}/event/batch",
                headers=self.headers,
                json={"batch": batch},
                timeout=30,  # Add reasonable timeout
            )

            if response.status_code == 200:
                response_data = response.json()
                self.log.info(
                    f"Successfully processed batch. "
                    f"Total: {response_data.get('total', 0)}, "
                    f"Processed: {response_data.get('processed', 0)}, "
                    f"Errors: {response_data.get('errors', 0)}"
                )
                return True
            else:
                self.log.error(
                    f"Batch failed with status {response.status_code}: {response.text}"
                )
                return False
        except requests.exceptions.Timeout:
            self.log.error("Request timed out while sending batch")
            return False
        except requests.exceptions.ConnectionError as e:
            self.log.error(f"Connection error while sending batch: {str(e)}")
            self.log.error(f"API URL: {self.api_url}")
            self.log.error(f"Headers: {json.dumps(self.headers, indent=2)}")
            return False
        except Exception as e:
            self.log.error(f"Error processing batch: {str(e)}")
            return False

    def run(self):
        try:
            # Read CSV file
            df = pd.read_csv(self.csv_path)
            total_records = len(df)
            self.log.info(f"Processing {total_records} records...")

            # Process in batches
            for i in range(0, total_records, self.batch_size):
                batch_df = df.iloc[i : i + self.batch_size]
                # Process rows and filter out None results (invalid records)
                batch_records = [
                    record
                    for record in [
                        self.process_row(row) for _, row in batch_df.iterrows()
                    ]
                    if record is not None
                ]

                if batch_records:
                    success = self.send_batch(batch_records)
                    if success:
                        self.log.info(
                            f"Successfully processed batch of {len(batch_records)} records"
                        )
                    else:
                        self.log.error(
                            f"Failed to process batch of {len(batch_records)} records"
                        )

                self.log.info(
                    f"Progress: {min(i + self.batch_size, total_records)}/{total_records} records"
                )

            self.log.info("Import completed!")
        except Exception as e:
            self.log.error(f"Error during import: {str(e)}")
            raise


def main():
    parser = argparse.ArgumentParser(description="Import data to Sequence from CSV")
    parser.add_argument("--input", required=True, help="Path to the CSV file")
    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Number of records per batch (default: 100)",
    )
    args = parser.parse_args()

    importer = SequenceImporter(args.input, args.batch_size)
    importer.run()


if __name__ == "__main__":
    main()
