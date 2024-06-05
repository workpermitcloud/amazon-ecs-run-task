## Amazon ECS "Run Task" Action for GitHub Actions

Runs an Amazon ECS task on ECS cluster.

**Table of Contents**

<!-- toc -->

- [Amazon ECS "Run Task" Action for GitHub Actions](#amazon-ecs-run-task-action-for-github-actions)
- [Usage](#usage)
- [Credentials and Region](#credentials-and-region)
- [Permissions](#permissions)
- [Troubleshooting](#troubleshooting)
- [License Summary](#license-summary)

<!-- tocstop -->

## Usage

```yaml
    - name: Run Task on Amazon ECS
      uses: workpermitcloud/amazon-ecs-run-task@v1
      with:
        task-definition-arn: task-definition-arn
        cluster: my-cluster
        count: 1
        started-by: github-actions-${{ github.actor }}
        wait-for-finish: true
```

See [action.yml](action.yml) for the full documentation for this action's inputs and outputs.

```yaml
   - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v1
      with:
      aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
      aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      aws-region: us-east-2

   - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1

   - name: Build, tag, and push image to Amazon ECR
      id: build-image
      env:
      ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
      ECR_REPOSITORY: my-ecr-repo
      IMAGE_TAG: ${{ github.sha }}
      run: |
      docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
      docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
      echo "::set-output name=image::$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG"

   - name: Fill in the new image ID in the Amazon ECS task definition
      id: task-def
      uses: aws-actions/amazon-ecs-render-task-definition@v1
      with:
      task-definition: task-definition.json
      container-name: my-container
      image: ${{ steps.build-image.outputs.image }}

   - name: Create task definition
      id: task-def-create
      uses: aws-actions/amazon-ecs-deploy-task-definition@v1
      with:
         task-definition: ${{ steps.seeder-def.outputs.task-definition }}

   - name: Run Task on Amazon ECS
      uses: workpermitcloud/amazon-ecs-run-task@v1
      with:
      task-definition-arn: ${{ steps.task-def-create.outputs.task-definition-arn}}
      cluster: my-cluster
      count: 1
      started-by: github-actions-${{ github.actor }}
      wait-for-finish: true
```

## Credentials and Region

This action relies on the [default behavior of the AWS SDK for Javascript](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials-node.html) to determine AWS credentials and region.
Use [the `aws-actions/configure-aws-credentials` action](https://github.com/aws-actions/configure-aws-credentials) to configure the GitHub Actions environment with environment variables containing AWS credentials and your desired region.

We recommend following [Amazon IAM best practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html) for the AWS credentials used in GitHub Actions workflows, including:
- Do not store credentials in your repository's code.  You may use [GitHub Actions secrets](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/creating-and-using-encrypted-secrets) to store credentials and redact credentials from GitHub Actions workflow logs.
- [Create an individual IAM user](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#create-iam-users) with an access key for use in GitHub Actions workflows, preferably one per repository. Do not use the AWS account root user access key.
- [Grant least privilege](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#grant-least-privilege) to the credentials used in GitHub Actions workflows.  Grant only the permissions required to perform the actions in your GitHub Actions workflows.  See the Permissions section below for the permissions required by this action.
- [Rotate the credentials](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#rotate-credentials) used in GitHub Actions workflows regularly.
- [Monitor the activity](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#keep-a-log) of the credentials used in GitHub Actions workflows.

## Permissions

This action requires the following minimum set of permissions:

```json
{
   "Version":"2012-10-17",
   "Statement":[
      {
         "Sid": "RunTask",
         "Effect": "Allow",
         "Action": "ecs:RunTask",
         "Resource": "arn:aws:ecs:<region>:<aws_account_id>:task-definition/*:*"
      },
      {
         "Sid": "DescribeTasks",
         "Effect": "Allow",
         "Action": "ecs:DescribeTasks",
         "Resource": "arn:aws:ecs:<region>:<aws_account_id>:task/*"
      }
   ]
}
```

Note: the policy above assumes the account has opted in to the ECS long ARN format.

## Troubleshooting

This action emits debug logs to help troubleshoot deployment failures.  To see the debug logs, create a secret named `ACTIONS_STEP_DEBUG` with value `true` in your repository.

## License Summary

This code is made available under the MIT license.
