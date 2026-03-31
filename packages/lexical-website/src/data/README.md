# Team Data

This directory contains dynamically generated data for the Lexical team page.

## team.json

The `team.json` file contains information about:
- **Core Team**: Active maintainers with PR review access who have contributed in the last 12 months
- **Core Team Emeriti**: Previous core team members who haven't been active recently but made significant contributions
- **Distinguished Contributors**: Community members with substantial contributions (75+ total contributions)

### Updating Team Data

The team data is automatically generated from GitHub contributor data using the `generate-team-data.js` script.

To update the team data:

```bash
pnpm run update-team-data
```

This script:
1. Fetches all contributors from the GitHub API
2. Checks recent activity (last 12 months) for tracked team members
3. Fetches user profile information (name, Twitter, company)
4. Categorizes contributors based on:
   - Whether they have PR review access
   - Recent commit activity
   - Total contribution count
5. Generates the `team.json` file with sorted team members

### Configuration

The team categorization logic is configured in `scripts/generate-team-data.js`:

- **`alwaysCoreTeam`**: People who should always be in core team regardless of activity
- **`prReviewers`**: GitHub users with PR review access
- **`emeriti`**: Previous core team members who should be honored if inactive
- **`overrides`**: Manual overrides for names, titles, organizations, etc.
- **`minCommitsForActive`**: Minimum commits in last 12 months to be considered active (default: 1)
- **`minContributionsForDistinguished`**: Minimum total contributions for distinguished contributor status (default: 75)

### When to Update

Update the team data:
- **Monthly** or **quarterly** to reflect recent contributions
- When adding new core team members
- When team members change roles or organizations
- Before major releases or announcements

### Manual Overrides

To add manual information (titles, organizations, etc.) for team members, edit the configuration in `scripts/generate-team-data.js`:

```javascript
overrides: {
  username: {
    name: 'Full Name',
    title: 'Core Maintainer',
    org: 'Company Name',
    orgLink: 'https://company.com',
    twitter: 'twitter_handle',
  },
}
```

### Requirements

- GitHub CLI (`gh`) must be installed and authenticated
- Internet connection to access GitHub API
- Node.js 18+
