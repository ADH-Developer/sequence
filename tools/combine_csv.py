#!/usr/bin/env python3

import argparse
import os
from pathlib import Path
from typing import List, Optional

import pandas as pd
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn


def validate_files_exist(files: List[str]) -> bool:
    """Check if all input files exist."""
    return all(os.path.exists(f) for f in files)


def check_matching_headers(files: List[str]) -> bool:
    """Check if all CSV files have matching headers."""
    if not files:
        return False

    # Read headers of first file
    first_headers = set(pd.read_csv(files[0], nrows=0).columns.tolist())

    # Compare with headers of other files
    for file in files[1:]:
        current_headers = set(pd.read_csv(file, nrows=0).columns.tolist())
        if current_headers != first_headers:
            return False
    return True


def combine_csv_files(
    input_files: List[str],
    output_file: str,
    skip_rows: Optional[int] = None,
    console: Optional[Console] = None,
) -> bool:
    """
    Combine multiple CSV files with matching headers into a single CSV file.

    Args:
        input_files: List of input CSV file paths
        output_file: Path to the output CSV file
        skip_rows: Number of rows to skip at the beginning of each file (optional)
        console: Rich console for output (optional)

    Returns:
        bool: True if successful, False otherwise
    """
    if console is None:
        console = Console()

    try:
        # Validate input files
        if not validate_files_exist(input_files):
            console.print("[red]Error: One or more input files do not exist[/red]")
            return False

        # Validate headers match
        if not check_matching_headers(input_files):
            console.print("[red]Error: Input files have different headers[/red]")
            return False

        # Create progress bar
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Combining CSV files...", total=len(input_files))

            # Get column order from first file
            first_df = pd.read_csv(
                input_files[0], skiprows=skip_rows if skip_rows else None
            )
            column_order = first_df.columns.tolist()

            # Initialize list with first dataframe
            dfs = [first_df]

            # Read and combine each CSV file
            for file in input_files[1:]:
                progress.update(
                    task, advance=1, description=f"Processing {Path(file).name}..."
                )
                df = pd.read_csv(file, skiprows=skip_rows if skip_rows else None)
                # Ensure columns are in the same order as the first file
                df = df[column_order]
                dfs.append(df)

            # Combine all dataframes
            combined_df = pd.concat(dfs, ignore_index=True)

            # Create output directory if it doesn't exist
            os.makedirs(os.path.dirname(output_file), exist_ok=True)

            # Save combined dataframe
            combined_df.to_csv(output_file, index=False)

            console.print(
                f"\n[green]Successfully combined {len(input_files)} files into {output_file}[/green]"
            )
            console.print(f"Total rows: {len(combined_df)}")

        return True

    except Exception as e:
        console.print(f"[red]Error: {str(e)}[/red]")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Combine multiple CSV files with matching headers"
    )
    parser.add_argument("input_files", nargs="+", help="Input CSV files to combine")
    parser.add_argument("-o", "--output", required=True, help="Output CSV file path")
    parser.add_argument(
        "--skip-rows",
        type=int,
        help="Number of rows to skip at the beginning of each file",
    )
    args = parser.parse_args()

    console = Console()
    combine_csv_files(args.input_files, args.output, args.skip_rows, console)


if __name__ == "__main__":
    main()
