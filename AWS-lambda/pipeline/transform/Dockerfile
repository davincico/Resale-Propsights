
# AWS Lambda base (arm64)
FROM public.ecr.aws/lambda/python:3.12-arm64

# (optional) speed up pip and keep image small
ENV PIP_NO_CACHE_DIR=1

# Install deps into Lambda task root
COPY requirements.txt .
RUN pip3 install -r requirements.txt --target "${LAMBDA_TASK_ROOT}"

# Copy code
COPY handler.py ${LAMBDA_TASK_ROOT}/

# Lambda entry point: module.function
CMD ["handler.handler"]
