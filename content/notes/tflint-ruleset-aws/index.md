---
title: TFlint AWS Ruleset Snippets
weight: 20
menu:
  notes:
    name: TFlint AWS
    identifier: tflint-aws
---
{{<note title="TFlint AWS docs" >}}
Documentation from the template in the /docs/rules/ folder can be generated with:
```bash
go generate ./...
```
{{</note>}}

{{<note title="TF Lint Submodule" >}}
This project contains a submodule in /rules/modles/aws-sdk-go. Make sure it is up to date.

During initial clone run

```bash
git submodule update -init
```
To keep up to date run the above command without the init argument.
{{</note>}}
