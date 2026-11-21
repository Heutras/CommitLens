/** Query keys for one repository. Lowercased because GitHub names are case-insensitive. */
export const repositoryKeys = {
  all: ['repository'],
  detail: (owner, repo) => [...repositoryKeys.all, owner.toLowerCase(), repo.toLowerCase()],
  section: (owner, repo, section) => [...repositoryKeys.detail(owner, repo), section],
};
