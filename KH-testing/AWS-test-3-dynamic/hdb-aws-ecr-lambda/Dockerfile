# Lambda base image for Python 3.12 (x86_64)
FROM public.ecr.aws/lambda/python:3.12

# Install Python deps into the Lambda task root
COPY requirements.txt .
RUN pip install -r requirements.txt --target "${LAMBDA_TASK_ROOT}"

# Copy handler into the task root
COPY handler.py ${LAMBDA_TASK_ROOT}/

# (Optional) bake the resource id here for quick test; better set in Lambda env later
# ENV RESOURCE_ID=d_8b84c4ee58e3cfc0ece0d773c8ca6abc

# Tell Lambda which function to call: <module>.<function>
CMD ["handler.handler"]
