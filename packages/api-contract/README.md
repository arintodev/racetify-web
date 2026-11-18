# @workspace/api-contract

`openapi.yaml` is copied from the backend-generated contract at
`racetify-api/packages/api-contract/openapi.yaml`. Do not edit it by hand.

```bash
pnpm --filter @workspace/api-contract sync      # copy the backend OpenAPI
pnpm --filter @workspace/api-contract generate  # regenerate api-client schema.d.ts
```

Set `RACETIFY_OPENAPI_SOURCE` to override the backend path (useful in CI or when the repos are
checked out separately).
