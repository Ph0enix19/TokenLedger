# Acme Corp Deployment Runbook

## Standard Deployment Process
1. Merge PR to main - CI must be green
2. Deployment is automatic via GitHub Actions to staging
3. Run smoke tests against staging (automated, 5 minutes)
4. Promote to production - requires 2 approvals
5. Monitor error rate for 15 minutes post-deploy

## Rollback Procedure
If error rate exceeds 1% within 15 minutes of deploy:
1. Trigger rollback workflow in GitHub Actions
2. Notify #engineering-alerts Slack channel
3. Open a P1 incident if users are affected

## Database Migrations
All migrations run automatically before the new code starts.
Migrations must be backwards-compatible with the previous version.
