#!/usr/bin/env python3

import argparse
import json
import logging
import os
import time
from base64 import b64encode
from typing import Dict, List, Optional

import numpy as np
import pandas as pd
import requests
from dotenv import load_dotenv
from rich.console import Console
from rich.layout import Layout
from rich.live import Live
from rich.logging import RichHandler
from rich.panel import Panel
from rich.progress import BarColumn, Progress, SpinnerColumn, TextColumn


class SequenceImporter:
    def __init__(self, csv_path: str, batch_size: int = 100):
        self.console = Console()
        self.progress = Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
            TextColumn("[progress.completed]{task.completed}/{task.total}"),
        )

        # Setup logging with Rich
        logging.basicConfig(
            level=logging.INFO,
            format="%(message)s",
            handlers=[RichHandler(console=self.console, show_time=False)],
        )
        self.log = logging.getLogger("sequence_import")

        self.csv_path = csv_path
        self.batch_size = batch_size
        self.layout = self.make_layout()

        # Load API token
        load_dotenv()
        self.api_token = os.getenv("SEQUENCE_API_TOKEN")
        if not self.api_token:
            raise ValueError("SEQUENCE_API_TOKEN environment variable is required")

        # Setup API headers
        token = b64encode(f"{self.api_token}:".encode()).decode()
        self.headers = {
            "Authorization": f"Basic {token}",
            "Content-Type": "application/json",
        }

    def make_layout(self) -> Layout:
        layout = Layout()
        layout.split(
            Layout(Panel("Sequence Import Progress"), size=3),
            Layout(Panel(self.progress), size=3),
            Layout(Panel("Log Output")),
        )
        return layout

    def process_row(self, row: pd.Series) -> Optional[Dict]:
        """Process a single row into a Sequence API format."""
        # Determine which email to use (primary or secondary)
        email = None
        name = None

        # Try primary email first
        if pd.notna(row["email_address"]) and row["email_address"]:
            email = row["email_address"]
            name = row["email_name"] if pd.notna(row["email_name"]) else ""
        # Try secondary email if primary not available
        elif pd.notna(row["second_email"]) and row["second_email"]:
            email = row["second_email"]
            name = (
                row["second_email_name"] if pd.notna(row["second_email_name"]) else ""
            )

        # Skip if no valid email
        if not email:
            return None

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

        # Convert batch_id to integer if available
        try:
            batch_id = (
                int(float(row["batch_id"])) if pd.notna(row["batch_id"]) else None
            )
        except (ValueError, TypeError):
            batch_id = None

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
            },
            "messageId": f"{email}_{int(time.time())}",
        }

    def send_batch(self, batch: List[Dict]) -> bool:
        """Send a batch of records to Sequence API."""
        try:
            # Debug log the data we're sending
            self.log.info(f"Sending batch data: {json.dumps(batch, indent=2)}")

            response = requests.post(
                "http://api:3000/event/batch",
                headers=self.headers,
                json={"batch": batch},
            )

            if response.status_code == 200:
                self.log.info(f"Successfully processed batch of {len(batch)} records")
                return True
            else:
                self.log.error(
                    f"Batch failed with status {response.status_code}: {response.text}"
                )
                return False
        except Exception as e:
            self.log.error(f"Error processing batch: {str(e)}")
            return False

    def run(self):
        try:
            # Read CSV, skipping the first two rows
            df = pd.read_csv(self.csv_path, skiprows=2)
            total_records = len(df)

            with Live(self.layout, refresh_per_second=10):
                overall_progress = self.progress.add_task(
                    "Processing records...", total=total_records
                )

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

                    self.progress.update(overall_progress, advance=len(batch_df))

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
