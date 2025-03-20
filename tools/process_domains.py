#!/usr/bin/env python3

import argparse
import glob
import os
import re
from typing import Optional, Tuple

import pandas as pd


def get_next_version_number(base_number: str) -> int:
    """Find the next version number for the output file."""
    existing_files = glob.glob(f"{base_number}_Final_v*.csv")
    if not existing_files:
        return 1

    versions = []
    for file in existing_files:
        match = re.search(r"v(\d+)\.csv$", file)
        if match:
            versions.append(int(match.group(1)))

    return max(versions) + 1 if versions else 1


def select_email_pair(
    row: pd.Series,
) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Select email/name pair based on priority hierarchy and return source type:
    1. email_address/email_name (A)
    2. second_email/second_email_name (A)
    3. scraped_email1/scraped_emails1_name (S)
    4. scraped_email2/scraped_email_name2 (S)
    Returns (email, name, source_type) where source_type is 'A' or 'S'
    """
    if pd.notna(row["email_address"]):
        return row["email_address"], row["email_name"], "A"

    if pd.notna(row["second_email"]):
        return row["second_email"], row["second_email_name"], "A"

    if pd.notna(row["scraped_email1"]):
        return row["scraped_email1"], row["scraped_emails1_name"], "S"

    if pd.notna(row["scraped_email2"]):
        return row["scraped_email2"], row["scraped_email_name2"], "S"

    return None, None, None


def process_domains(input_file: str) -> None:
    """Process domain data and create filtered output file."""
    # Extract base number from input filename and get directory
    input_dir = os.path.dirname(input_file)
    match = re.search(r"(\d+)", os.path.basename(input_file))
    if not match:
        raise ValueError("Input filename must contain a number")

    base_number = match.group(1)
    version = get_next_version_number(base_number)
    output_file = os.path.join(input_dir, f"{base_number}_Final_v{version}.csv")

    # Read input file
    df = pd.read_csv(input_file)

    # Process each row to select email pairs
    email_pairs = df.apply(select_email_pair, axis=1)
    df["selected_email"] = [pair[0] for pair in email_pairs]
    df["selected_name"] = [pair[1] for pair in email_pairs]
    df["email_source"] = [pair[2] for pair in email_pairs]

    # Filter rows that have scores and email
    filtered_df = df[
        df["desktop_score"].notna()
        & df["mobile_score"].notna()
        & df["selected_email"].notna()
    ]

    # Create output dataframe with required columns and modified batch_id
    output_df = pd.DataFrame(
        {
            "domain": filtered_df["domain"],
            "desktop_score": filtered_df["desktop_score"],
            "mobile_score": filtered_df["mobile_score"],
            "email_address": filtered_df["selected_email"],
            "email_name": filtered_df["selected_name"],
            "batch_id": filtered_df["batch_id"].astype(str)
            + filtered_df["email_source"],
            "response": filtered_df["error"],  # Using 'error' column for response
        }
    )

    # Save to CSV
    output_df.to_csv(output_file, index=False)
    print(f"Processed {len(filtered_df)} domains")
    print(f"Output saved to {output_file}")


def main():
    parser = argparse.ArgumentParser(
        description="Process domain data and create filtered CSV output"
    )
    parser.add_argument("--input-file", required=True, help="Path to input CSV file")

    args = parser.parse_args()
    process_domains(args.input_file)


if __name__ == "__main__":
    main()
