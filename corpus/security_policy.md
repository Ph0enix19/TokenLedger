# Acme Corp Security Policy

## Access Control
All production systems require MFA. SSH key access only - no password authentication.
Access reviews are conducted quarterly. Unused accounts are disabled after 90 days.

## Secret Management
Secrets must never be committed to Git. Use the company Vault instance at vault.acme.internal.
All API keys must be rotated every 90 days. Compromised keys must be rotated within 1 hour.

## AI Tool Usage
All LLM usage must go through the TokenLedger gateway. Direct API calls to LLM providers
are not permitted without approval from the security team.
