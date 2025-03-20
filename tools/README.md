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

### process_domains.py

A utility script for processing domain data from CSV files, filtering based on scores and email availability, and creating a formatted output file.

#### Features
- Filters domains that have both desktop and mobile scores
- Selects email/name pairs based on priority hierarchy:
  1. email_address/email_name (marked with 'A' suffix)
  2. second_email/second_email_name (marked with 'A' suffix)
  3. scraped_email1/scraped_emails1_name (marked with 'S' suffix)
  4. scraped_email2/scraped_email_name2 (marked with 'S' suffix)
- Appends source identifier to batch_id ('A' for direct emails, 'S' for scraped)
- Automatically versions output files
- Saves output in the same directory as input file

#### Usage

With Docker:
```bash
docker run --rm -v "$(pwd):/data" sequence-tools process_domains.py --input-file "/data/path/to/your/input.csv"
```

Arguments:
- `--input-file`: Path to the input CSV file (required)

#### Example

Processing a shopify domains file:
```bash
# Navigate to the directory containing your results
cd pagespeed/results/150320251816

# Run the process_domains script
docker run --rm -v "$(pwd):/data" sequence-tools process_domains.py --input-file "/data/shopify domains - 150320251816.csv"

# Alternatively, you can run it from anywhere using full paths:
docker run --rm -v /media/andrew/6260ff86-fd26-40cd-b665-9112e664270b/home/andrew/Dev/PageSpeed/pagespeed/results/150320251816:/data sequence-tools process_domains.py --input-file "/data/shopify domains - 150320251816.csv"
```

The script will create an output file named `150320251816_Final_v1.csv` (or increment the version number if the file already exists) in the same directory as the input file.

#### Output Format
The output CSV will contain the following columns:
- domain
- desktop_score
- mobile_score
- email_address (selected based on priority)
- email_name (corresponding to selected email)
- batch_id (with 'A' or 'S' suffix indicating email source)
- response (from error column) 

