FROM python:3.8-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/

# Set the entrypoint script as executable
RUN chmod +x src/import_to_sequence.py

ENTRYPOINT ["python", "src/import_to_sequence.py"] 