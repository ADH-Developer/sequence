FROM python:3.8-slim

WORKDIR /tools

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all tools
COPY . .

# Make scripts executable
RUN chmod +x *.py

ENTRYPOINT ["python"] 