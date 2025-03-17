# Sequence Tools

This directory contains utility tools for working with the Sequence project.

## Running with Docker

First, build the Docker image:
```bash
docker build -t sequence-tools .
```

Then you can run any tool using:
```bash
docker run --rm -v "$(pwd):/data" sequence-tools <tool_script> [arguments]
```

**Important**: Always run the Docker commands from the directory containing the files you want to process. The tool will look for files relative to this directory, which will be mounted as `/data` inside the container.

## Available Tools

### combine_csv.py

A utility script for combining multiple CSV files that have matching headers into a single CSV file.

#### Features
- Combines multiple CSV files with matching headers
- Validates file existence and header compatibility
- Option to skip rows at the beginning of files
- Shows progress while processing
- Creates output directories automatically
- Rich console output with progress indicators

#### Usage

Direct usage:
```bash
./combine_csv.py <input_files> -o <output_file> [--skip-rows N]
```

With Docker:
```bash
docker run --rm -v "$(pwd):/data" sequence-tools combine_csv.py <input_files> -o <output_file> [--skip-rows N]
```

Arguments:
- `input_files`: One or more input CSV files to combine
- `-o, --output`: Path to the output CSV file (required)
- `--skip-rows`: Number of rows to skip at the beginning of each file (optional)

#### Examples

1. Combining failed.csv files from PageSpeed results:
```bash
# First, navigate to the directory containing your results
cd pagespeed

# Then run the combine command
docker run --rm -v "$(pwd):/data" sequence-tools combine_csv.py \
    "/data/results/150320251816/6/failed.csv" \
    "/data/results/150320251816/7/failed.csv" \
    "/data/results/150320251816/8/failed.csv" \
    "/data/results/150320251816/9/failed.csv" \
    "/data/results/150320251816/10/failed.csv" \
    -o "/data/results/150320251816/combined_failed.csv"
```

2. Combining numbered CSV files (skipping header rows):
```bash
# Make sure you're in the directory containing your CSV files
cd /path/to/your/csv/files

docker run --rm -v "$(pwd):/data" sequence-tools combine_csv.py \
    "/data/file1.csv" \
    "/data/file2.csv" \
    "/data/file3.csv" \
    --skip-rows 1 \
    -o "/data/combined_output.csv"
```

#### Directory Structure
When using Docker, your directory structure should look like this:
```
your_working_directory/
├── file1.csv
├── file2.csv
└── subdirectory/
    ├── file3.csv
    └── output/
```

And you would reference files like this:
```bash
docker run --rm -v "$(pwd):/data" sequence-tools combine_csv.py \
    "/data/file1.csv" \
    "/data/file2.csv" \
    "/data/subdirectory/file3.csv" \
    -o "/data/subdirectory/output/combined.csv"
```

#### Requirements
If running directly (without Docker):
- Python 3.8+
- pandas
- rich

If running with Docker:
- Docker 