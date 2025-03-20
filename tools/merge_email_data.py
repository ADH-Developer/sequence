#!/usr/bin/env python3

import argparse
import re
from typing import Optional, Tuple

import pandas as pd


def clean_domain(domain: str) -> str:
    """Remove https:// or http:// from domain and clean whitespace."""
    domain = re.sub(r"^https?://", "", domain.strip())
    return domain.strip("/")


def split_emails(email_str: str) -> Tuple[Optional[str], Optional[str]]:
    """Split comma-separated email string into two emails."""
    if not isinstance(email_str, str):
        return None, None

    emails = [e.strip() for e in email_str.split(",")]
    email1 = emails[0] if emails else None
    email2 = emails[1] if len(emails) > 1 else None
    return email1, email2


def merge_email_data(shopify_file: str, emails_file: str, output_file: str) -> None:
    """
    Merge email data from combined emails CSV into shopify domains CSV.

    Args:
        shopify_file: Path to shopify domains CSV file
        emails_file: Path to combined emails CSV file
        output_file: Path to output merged CSV file
    """
    # Read input files with specific handling
    emails_df = pd.read_csv(emails_file, usecols=["domain", "emails"])
    shopify_df = pd.read_csv(shopify_file, low_memory=False)  # Handle mixed types

    # Clean domain names in both dataframes
    emails_df["clean_domain"] = emails_df["domain"].apply(clean_domain)
    shopify_df["clean_domain"] = shopify_df["domain"].apply(clean_domain)

    # Split emails into separate columns
    emails_split = emails_df["emails"].apply(split_emails)
    emails_df["email1"], emails_df["email2"] = zip(*emails_split)

    # Create a mapping dictionary for faster lookup
    email_map = emails_df.set_index("clean_domain")[["email1", "email2"]].to_dict(
        "index"
    )

    # Update scraped emails columns in shopify dataframe
    for idx, row in shopify_df.iterrows():
        domain = row["clean_domain"]
        if domain in email_map:
            shopify_df.at[idx, "scraped_email1"] = email_map[domain]["email1"]
            shopify_df.at[idx, "scraped_email2"] = email_map[domain]["email2"]

    # Drop temporary clean_domain column and save
    shopify_df.drop("clean_domain", axis=1, inplace=True)
    shopify_df.to_csv(output_file, index=False)

    print(f"Successfully merged email data and saved to {output_file}")
    print(f"Processed {len(emails_df)} email records")
    print(
        f"Updated {len(shopify_df[shopify_df['scraped_email1'].notna()])} domains with email data"
    )


def main():
    parser = argparse.ArgumentParser(
        description="Merge email data from combined CSV into shopify domains CSV"
    )
    parser.add_argument(
        "--shopify-file", required=True, help="Path to shopify domains CSV file"
    )
    parser.add_argument(
        "--emails-file", required=True, help="Path to combined emails CSV file"
    )
    parser.add_argument(
        "--output", required=True, help="Path to output merged CSV file"
    )

    args = parser.parse_args()

    merge_email_data(args.shopify_file, args.emails_file, args.output)


if __name__ == "__main__":
    main()
