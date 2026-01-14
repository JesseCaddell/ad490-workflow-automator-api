## Repository Installation & Authentication Flow

- User installs the Flowwarden GitHub App on a specific repository
- GitHub prompts the user to approve requested repository permissions
- GitHub creates a repository-scoped installation
- GitHub assigns a unique **Installation ID** to the repository installation

- GitHub sends an `installation` webhook event to the API
- Webhook payload includes:
    - Installation ID
    - Repository metadata
    - Account (user or organization)

- Backend generates a JSON Web Token (JWT) using:
    - GitHub App ID
    - GitHub App private key

- Backend exchanges the JWT for an **installation access token**
- Installation access token is:
    - Scoped to the Installation ID
    - Limited to approved repository permissions
    - Short-lived and refreshed as needed

- Backend uses the installation token to perform authenticated GitHub API actions
- Actions are restricted to the repository where the app is installed

- GitHub delivers subsequent webhook events for the repository
- Each webhook includes the Installation ID
- Backend:
    - Verifies webhook signature
    - Resolves Installation ID to an access token
    - Processes the event in the correct repository context
