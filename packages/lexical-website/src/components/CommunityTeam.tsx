/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import Link from '@docusaurus/Link';
import Translate from '@docusaurus/Translate';
import teamData from '@site/src/data/team.json';
import React from 'react';

interface TeamMember {
  avatar: string;
  links: {
    github: string;
  };
  location?: string;
  name: string;
  org?: string;
  orgLink?: string;
  sponsor?: string;
  title?: string;
  username: string;
}

interface TeamSectionProps {
  title: React.ReactNode;
  description: React.ReactNode;
  members: TeamMember[];
}

function TeamMemberCard({member}: {member: TeamMember}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 p-6 transition-shadow hover:shadow-lg dark:border-gray-700">
      <img
        src={member.avatar}
        alt={member.name}
        className="h-24 w-24 rounded-full"
      />
      <div className="flex flex-col items-center gap-1 text-center">
        <h3 className="m-0 text-lg font-semibold">{member.name}</h3>
        <Link
          to={member.links.github}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path
              fillRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              clipRule="evenodd"
            />
          </svg>
          @{member.username}
        </Link>
        {member.sponsor && (
          <Link
            to={member.sponsor}
            className="rounded bg-pink-100 px-2 py-1 text-xs font-medium text-pink-700 transition-colors hover:bg-pink-200 dark:bg-pink-900 dark:text-pink-200 dark:hover:bg-pink-800"
            aria-label={`Sponsor ${member.name}`}>
            💖 Sponsor
          </Link>
        )}
        {member.title && (
          <p className="m-0 text-sm text-gray-600 dark:text-gray-400">
            {member.title}
          </p>
        )}
        {member.org && (
          <p className="m-0 text-sm">
            {member.orgLink ? (
              <Link
                to={member.orgLink}
                className="text-blue-600 dark:text-blue-400">
                {member.org}
              </Link>
            ) : (
              <span className="text-gray-600 dark:text-gray-400">
                {member.org}
              </span>
            )}
          </p>
        )}
        {member.location && (
          <p className="m-0 text-xs text-gray-500 dark:text-gray-400">
            📍 {member.location}
          </p>
        )}
      </div>
    </div>
  );
}

function TeamSection({title, description, members}: TeamSectionProps) {
  return (
    <div className="mb-16">
      <h2 className="mb-4 text-2xl font-bold">{title}</h2>
      <p className="mb-8 text-gray-600 dark:text-gray-400">{description}</p>
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {members.map((member, index) => (
          <TeamMemberCard key={index} member={member} />
        ))}
      </div>
    </div>
  );
}

export default function CommunityTeam() {
  const coreTeam: TeamMember[] = teamData.core as TeamMember[];
  const emeriti: TeamMember[] = teamData.emeriti as TeamMember[];
  const distinguishedContributors: TeamMember[] =
    teamData.distinguished as TeamMember[];

  return (
    <div>
      <div className="mb-12">
        <h2>
          <Translate
            id="pages.community.team.header"
            description="Header for team section">
            Meet the Team
          </Translate>
        </h2>
        <p>
          <Translate
            id="pages.community.team.description"
            description="Description of team section">
            The development of Lexical is led by a core team of maintainers from
            Meta and the open source community. We are grateful for the
            contributions of all our community members who help make Lexical
            better every day.
          </Translate>
        </p>
      </div>

      <TeamSection
        title={
          <Translate
            id="pages.community.team.core.title"
            description="Core team section title">
            Core Team
          </Translate>
        }
        description={
          <Translate
            id="pages.community.team.core.description"
            description="Core team section description">
            Core team members actively maintain the project and have made
            significant contributions to Lexical, with a long-term commitment to
            its success and the community.
          </Translate>
        }
        members={coreTeam}
      />

      <TeamSection
        title={
          <Translate
            id="pages.community.team.emeriti.title"
            description="Core team emeriti section title">
            Core Team Emeriti
          </Translate>
        }
        description={
          <Translate
            id="pages.community.team.emeriti.description"
            description="Core team emeriti section description">
            We honor some no-longer-active core team members who helped shape
            Lexical into what it is today.
          </Translate>
        }
        members={emeriti}
      />

      <TeamSection
        title={
          <Translate
            id="pages.community.team.distinguished.title"
            description="Distinguished contributors section title">
            Distinguished Contributors
          </Translate>
        }
        description={
          <Translate
            id="pages.community.team.distinguished.description"
            description="Distinguished contributors section description">
            These community members have made exceptional contributions to
            Lexical through significant code contributions, documentation, or
            community support.
          </Translate>
        }
        members={distinguishedContributors}
      />
    </div>
  );
}
