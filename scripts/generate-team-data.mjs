/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/* eslint-disable no-console */
// @ts-check

/**
 * This requires the GitHub CLI (`gh`) to be installed and authenticated
 */

import {execSync} from 'child_process';
import fs from 'fs-extra';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configuration for team members and roles
 * This is the manually curated list of people with specific roles
 */
const TEAM_CONFIG = {
  // People who should be in emeriti if not active
  emeriti: [
    'acywatson',
    'potatowagon',
    'trueadm',
    'tylerjbainbridge',
    'thegreatercurve',
  ],
  // Minimum commits in last 12 months to be considered active
  minCommitsForActive: 1,
  // Minimum total contributions to be considered distinguished
  minContributionsForDistinguished: 11,
  // People who have PR review access (should be core team if active)
  prReviewers: [
    'zurfyx',
    'fantactuka',
    'acywatson',
    'ivailop7',
    'potatowagon',
    'etrepum',
  ],
};

/**
 * Executes a shell command and returns the output
 */
function exec(command) {
  try {
    return execSync(command, {encoding: 'utf8'}).trim();
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    return null;
  }
}

/**
 * Fetches contributor data from GitHub API
 */
function fetchContributors() {
  console.log('Fetching contributors from GitHub...');
  const result = exec(
    "gh api repos/facebook/lexical/contributors --jq '.[] | {login, contributions, avatar_url, html_url}' --paginate",
  );
  if (!result) {
    throw new Error('Failed to fetch contributors');
  }
  const lines = result.split('\n').filter((line) => line.trim());
  return lines.map((line) => JSON.parse(line));
}

/**
 * Fetches recent commits for a user (last 12 months)
 */
function fetchRecentCommits(username) {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const since = oneYearAgo.toISOString();

  console.log(`  Checking activity for ${username}...`);
  const result = exec(
    `gh api /repos/facebook/lexical/commits?author=${username}'&'since=${since} --jq 'length'`,
  );
  return result ? parseInt(result, 10) : 0;
}

/**
 * Fetches user profile information from GitHub
 */
function fetchUserProfile(username) {
  console.log(`  Fetching profile for ${username}...`);
  const result = exec(
    `gh api users/${username} --jq '{name, bio, company, blog, location}'`,
  );
  return result ? JSON.parse(result) : null;
}

/**
 * Fetches sponsorship information from GitHub GraphQL API
 */
function fetchSponsorInfo(username) {
  const query = `{
    user(login: "${username}") {
      hasSponsorsListing
    }
  }`;
  const result = exec(`gh api graphql -f query='${query}'`);
  if (result) {
    try {
      const data = JSON.parse(result);
      return (
        (data.data && data.data.user && data.data.user.hasSponsorsListing) ||
        false
      );
    } catch (_error) {
      return false;
    }
  }
  return false;
}

/**
 * Determines which category a contributor belongs to
 */
function categorizeContributor(contributor, recentCommits) {
  const {login} = contributor;
  const isActive = recentCommits >= TEAM_CONFIG.minCommitsForActive;

  // Check if they're in emeriti list
  if (TEAM_CONFIG.emeriti.includes(login)) {
    if (!isActive) {
      return 'emeriti';
    }
    // If they're active again, they go back to core team
    if (TEAM_CONFIG.prReviewers.includes(login)) {
      return 'core';
    }
  }

  // Check if they should be in core team
  if (TEAM_CONFIG.prReviewers.includes(login) && isActive) {
    return 'core';
  }

  // Check if they qualify for distinguished contributors
  if (
    contributor.contributions >= TEAM_CONFIG.minContributionsForDistinguished
  ) {
    return 'distinguished';
  }

  return 'other';
}

/**
 * Builds team member object with all required information
 */
function buildTeamMember(contributor, profile, hasSponsors, category) {
  const {login, avatar_url, html_url} = contributor;

  // Use GitHub display name or username as fallback
  const displayName = (profile && profile.name) || login;

  const member = {
    avatar: avatar_url,
    links: {
      github: html_url,
    },
    name: displayName,
    username: login,
  };

  if (profile && profile.location) {
    member.location = profile.location;
  }

  if (profile && profile.company) {
    const orgName = profile.company.trim();
    // Extract GitHub org handle if it starts with @
    const githubOrgMatch = orgName.match(/@(\S+)/);

    if (githubOrgMatch) {
      // Take only the first @org if there are multiple
      const orgHandle = githubOrgMatch[1].split(/\s/)[0];
      let orgDisplayName = orgHandle;

      // Special case: facebook should display as Meta
      if (orgHandle.toLowerCase() === 'facebook') {
        orgDisplayName = 'Meta';
      } else if (orgHandle.toLowerCase() === 'meta') {
        // meta should link to facebook and display as Meta
        orgDisplayName = 'Meta';
      } else if (!/[A-Z]/.test(orgDisplayName)) {
        // If no capital letters, capitalize first letter
        orgDisplayName =
          orgDisplayName.charAt(0).toUpperCase() + orgDisplayName.slice(1);
      }

      member.org = orgDisplayName;
      // Always link to facebook for Meta references
      const linkHandle =
        orgHandle.toLowerCase() === 'meta' ? 'facebook' : orgHandle;
      member.orgLink = `https://github.com/${linkHandle}`;
    } else {
      // Non-GitHub org - take first org if multiple, capitalize if needed
      const firstOrg = orgName.split(/\s+/)[0];
      let orgDisplayName = firstOrg;

      if (firstOrg.toLowerCase() === 'facebook') {
        orgDisplayName = 'Meta';
      } else if (!/[A-Z]/.test(orgDisplayName)) {
        orgDisplayName =
          orgDisplayName.charAt(0).toUpperCase() + orgDisplayName.slice(1);
      }

      member.org = orgDisplayName;
    }
  }

  if (hasSponsors) {
    member.sponsor = `https://github.com/sponsors/${login}`;
  }

  // Add title based on category
  if (category === 'core') {
    member.title = 'Core Maintainer';
  } else if (category === 'emeriti') {
    member.title = login === 'trueadm' ? 'Creator' : 'Core Team Emeritus';
  }

  return member;
}

/**
 * Main function to generate team data
 */
async function generateTeamData() {
  console.log('Starting team data generation...\n');

  // Fetch all contributors
  const contributors = fetchContributors();
  console.log(`Found ${contributors.length} total contributors\n`);

  const teamData = {
    core: [],
    distinguished: [],
    emeriti: [],
    generated: new Date().toISOString(),
  };

  // Process each contributor
  for (const contributor of contributors) {
    const {login, contributions} = contributor;

    // Skip bots
    if (login.includes('[bot]')) {
      continue;
    }

    // Check if this person is in any of our tracked lists
    const isTracked =
      TEAM_CONFIG.prReviewers.includes(login) ||
      TEAM_CONFIG.emeriti.includes(login) ||
      contributions >= TEAM_CONFIG.minContributionsForDistinguished;

    if (!isTracked) {
      continue;
    }

    console.log(`Processing ${login} (${contributions} contributions)...`);

    // Fetch recent activity
    const recentCommits = fetchRecentCommits(login);
    console.log(`  Recent commits: ${recentCommits}`);

    // Categorize the contributor
    const category = categorizeContributor(contributor, recentCommits);
    console.log(`  Category: ${category}`);

    if (category === 'other') {
      console.log(`  Skipping (not in a display category)\n`);
      continue;
    }

    // Fetch profile info
    const profile = fetchUserProfile(login);

    // Fetch sponsor info
    console.log(`  Checking for sponsorship...`);
    const hasSponsors = fetchSponsorInfo(login);
    console.log(`  Has sponsors listing: ${hasSponsors}`);

    // Build team member object
    const member = buildTeamMember(contributor, profile, hasSponsors, category);

    // Add to appropriate category
    teamData[category].push(member);
    console.log(`  Added to ${category}\n`);
  }

  // Sort each category by name
  teamData.core.sort((a, b) => a.name.localeCompare(b.name));
  teamData.emeriti.sort((a, b) => a.name.localeCompare(b.name));
  teamData.distinguished.sort((a, b) => a.name.localeCompare(b.name));

  // Write to file
  const outputPath = path.join(
    __dirname,
    '..',
    'packages',
    'lexical-website',
    'src',
    'data',
    'team.json',
  );

  // Ensure directory exists
  fs.ensureDirSync(path.dirname(outputPath));

  // Write with pretty formatting
  fs.writeFileSync(outputPath, JSON.stringify(teamData, null, 2) + '\n');

  console.log('\n✅ Team data generated successfully!');
  console.log(`📄 Output: ${outputPath}`);
  console.log(`\nSummary:`);
  console.log(`  - Core Team: ${teamData.core.length} members`);
  console.log(`  - Emeriti: ${teamData.emeriti.length} members`);
  console.log(`  - Distinguished: ${teamData.distinguished.length} members`);
}

// Run the script
generateTeamData().catch((error) => {
  console.error('Error generating team data:', error);
  process.exit(1);
});
