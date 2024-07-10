---
layout: post
title: "Discovering Azure DevOps Pipeline Performance Issues"
category: posts
---

Recently I ran into some very unusual issues with Azure DevOps pipelines. The
pipelines were running very slowly, and the logs were not providing any useful
information. I decided to dig deeper and see if I could find the root cause of
the issue.

I opened a case with Microsoft support, and it become very challenging to even
communicate the issue. The support engineer was not able to understand the
issue, and I was not able to provide enough information to help them understand
the issue.

I ended up authoring a program in Python to help me understand the issue. The
program would run and hit the Azure DevOps API to get the status of the
pipeline. I would then log the status of the pipeline to a file. I ran this
program for a few days and was able to see that the pipeline was running very
slowly.

```python
import os
from datetime import datetime

import requests
import yaml
from requests.auth import HTTPBasicAuth

ADO_ORGANIZATION: str = "<fill-me-in>"
ADO_PROJECT: str = "<fill-me-in>"
ADO_BUILD_DEFINITION: int = "<fill-me-in>"


class Node:
    def __init__(self, id, type, name, startTime, finishTime, parentId=None, state=None, result=None):
        self.id = id
        self.type = type
        self.name = name
        self.startTime = self.parse_time(startTime)
        self.finishTime = self.parse_time(finishTime)
        self.parentId = parentId
        self.state = state
        self.result = result
        self.children = []

    def parse_time(self, time_str):
        if time_str is None:
            return None
        # Ensure microseconds have exactly 6 digits
        adjusted_time_str = self.ensure_six_digit_microseconds(time_str)
        return datetime.strptime(adjusted_time_str, "%Y-%m-%dT%H:%M:%S.%fZ")

    def ensure_six_digit_microseconds(self, time_str):
        if "." in time_str:
            parts = time_str.split(".")
            microseconds = parts[1].rstrip("Z")
            microseconds = microseconds[:6].ljust(6, "0")  # Ensure exactly 6 digits
            return f"{parts[0]}.{microseconds}Z"
        elif "Z" in time_str:
            return time_str.replace("Z", ".000000Z")
        else:
            return f"{time_str}.000000Z"

    def duration(self):
        if self.startTime and self.finishTime:
            return (self.finishTime - self.startTime).total_seconds()
        return 0

    def is_successful(self):
        return self.state == "completed" and self.result == "succeeded"


def build_tree(data):
    nodes = {
        item["id"]: Node(
            item["id"],
            item["type"],
            item["name"],
            item["startTime"],
            item["finishTime"],
            item.get("parentId"),
            item.get("state"),
            item.get("result"),
        )
        for item in data
    }
    roots = []

    for node in nodes.values():
        if not node.is_successful():
            continue
        if node.parentId:
            parent = nodes[node.parentId]
            parent.children.append(node)
        else:
            roots.append(node)

    return roots


def check_discrepancies(node, discrepancies, stage_name=None):
    if not node.startTime or not node.finishTime:
        return 0

    if not node.children:
        return node.duration()

    total_child_duration = sum(
        check_discrepancies(child, discrepancies, node.name if node.type == "Stage" else stage_name) for child in node.children
    )
    node_duration = node.duration()

    if node_duration > 0 and total_child_duration > 0 and total_child_duration < node_duration * 0.2:
        discrepancies.append((stage_name, node.name))

    return node_duration


def analyze_timeline(timeline_data):
    roots = build_tree(timeline_data)
    discrepancies = []

    for root in roots:
        check_discrepancies(root, discrepancies)

    return discrepancies


def summarize_discrepancies(discrepancies, build):
    build_summary = {
        "buildId": build["id"],
        "queueTime": build["queueTime"],
        "startTime": build["startTime"],
        "finishTime": build["finishTime"],
        "discrepanciesCount": len(discrepancies),
        "discrepancies": [{"stage": stage, "job": job} for stage, job in discrepancies],
        "results": f"https://dev.azure.com/{ADO_ORGANIZATION}/{ADO_PROJECT}/_build/results?buildId={build['id']}&view=results",
    }
    return build_summary


def main():
    ado_token = os.getenv("ADO_ACCESS_TOKEN")
    if not ado_token:
        print("ADO_ACCESS_TOKEN environment variable not set.")
        return

    session = requests.Session()
    session.auth = HTTPBasicAuth("", ado_token)

    builds_url = f"https://dev.azure.com/{ADO_ORGANIZATION}/{ADO_PROJECT}/_apis/build/builds?definitions={ADO_BUILD_DEFINITION}&statusFilter=completed&api-version=6.0"
    builds_response = session.get(builds_url)
    builds_data = builds_response.json()["value"]

    builds_with_discrepancies = []

    for build in builds_data:
        if build["status"] == "completed" and build["result"] == "succeeded":
            timeline_url = build["_links"]["timeline"]["href"]
            build_id = build["id"]

            timeline_response = session.get(timeline_url)
            timeline_data = timeline_response.json()["records"]

            discrepancies = analyze_timeline(timeline_data)
            if discrepancies:
                build_summary = summarize_discrepancies(discrepancies, build)
                builds_with_discrepancies.append(build_summary)

    output = {"builds_with_discrepancies": builds_with_discrepancies}
    print(yaml.dump(output, default_flow_style=False))


if __name__ == "__main__":
    main()
```
