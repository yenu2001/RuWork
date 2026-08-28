# Private Admin provisioning

Public Admin registration is intentionally unavailable.

To create the first Admin safely:

1. Configure a valid `MONGODB_URI` and the `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` variables in the ignored `.env` file.
2. From `RuWork_backend-master`, run:

   ```text
   npm run create-admin
   ```

The command validates the email and password policy, rejects duplicate Admin emails, hashes the password, and never prints the plaintext password.
