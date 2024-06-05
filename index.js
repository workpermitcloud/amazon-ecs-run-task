const core = require("@actions/core");
const { ECS, waitUntilTasksStopped } = require("@aws-sdk/client-ecs");

// const WAIT_DEFAULT_DELAY_SEC = 5;
const MAX_WAIT_MINUTES = 360;

async function run() {
  try {
    const agent = "amazon-ecs-run-task-for-github-actions";

    const ecs = new ECS({
      customUserAgent: agent,
    });

    // Get inputs
    const taskDefArn = core.getInput("task-definition-arn", { required: true });
    const cluster = core.getInput("cluster", { required: false });
    const count = core.getInput("count", { required: true });
    const startedBy = core.getInput("started-by", { required: false }) || agent;
    const waitForFinish =
      core.getInput("wait-for-finish", { required: false }) || false;
    let waitForMinutes =
      parseInt(core.getInput("wait-for-minutes", { required: false })) || 30;
    if (waitForMinutes > MAX_WAIT_MINUTES) {
      waitForMinutes = MAX_WAIT_MINUTES;
    }

    const clusterName = cluster ? cluster : "default";

    core.debug(
      `Running task with ${JSON.stringify({
        cluster: clusterName,
        taskDefinition: taskDefArn,
        count: count,
        startedBy: startedBy,
      })}`
    );

    const runTaskResponse = await ecs.runTask({
      cluster: clusterName,
      taskDefinition: taskDefArn,
      count: parseInt(count),
      startedBy: startedBy,
    });

    core.debug(`Run task response ${JSON.stringify(runTaskResponse)}`);

    if (runTaskResponse.failures && runTaskResponse.failures.length > 0) {
      const failure = runTaskResponse.failures[0];
      throw new Error(`${failure.arn} is ${failure.reason}`);
    }

    const taskArns = runTaskResponse.tasks.map((task) => task.taskArn);

    core.setOutput("task-arn", taskArns);

    if (waitForFinish && waitForFinish.toLowerCase() === "true") {
      await waitForTasksStopped(ecs, clusterName, taskArns, waitForMinutes);
      await tasksExitCode(ecs, clusterName, taskArns);
    }
  } catch (error) {
    core.setFailed(error.message);
    core.debug(error.stack);
  }
}

async function waitForTasksStopped(ecs, clusterName, taskArns, waitForMinutes) {
  if (waitForMinutes > MAX_WAIT_MINUTES) {
    waitForMinutes = MAX_WAIT_MINUTES;
  }

  // const maxAttempts = (waitForMinutes * 60) / WAIT_DEFAULT_DELAY_SEC;

  core.debug("Waiting for tasks to stop");

  const waitTaskResponse = await waitUntilTasksStopped(
    {
      client: ecs,
      maxWaitTime: 200,
    },
    {
      cluster: clusterName,
      tasks: taskArns,
    }
  );

  core.debug(`Run task response ${JSON.stringify(waitTaskResponse)}`);

  core.info(
    `All tasks have stopped. Watch progress in the Amazon ECS console: https://console.aws.amazon.com/ecs/home?region=[aws.config.region]#/clusters/${clusterName}/tasks`
  );
}

async function tasksExitCode(ecs, clusterName, taskArns) {
  const describeResponse = await ecs.describeTasks({
    cluster: clusterName,
    tasks: taskArns,
  });

  const containers = [].concat(
    ...describeResponse.tasks.map((task) => task.containers)
  );
  const exitCodes = containers.map((container) => container.exitCode);
  const reasons = containers.map((container) => container.reason);

  const failuresIdx = [];

  exitCodes.filter((exitCode, index) => {
    if (exitCode !== 0) {
      failuresIdx.push(index);
    }
  });

  const failures = reasons.filter(
    (_, index) => failuresIdx.indexOf(index) !== -1
  );

  if (failures.length > 0) {
    core.setFailed(failures.join("\n"));
  } else {
    core.info(`All tasks have exited successfully.`);
  }
}

module.exports = run;

/* istanbul ignore next */
if (require.main === module) {
  run();
}
