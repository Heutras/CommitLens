/** Values that change per deployment. Unset values hide the features that need them. */
export const siteConfig = {
  name: 'CommitLens',
  repositoryUrl: import.meta.env.VITE_REPOSITORY_URL || null,
  githubDocsUrl: 'https://docs.github.com/en/rest',
};

/** In-page destinations shared by the header and footer. */
export const navigation = [
  { href: '#product', label: 'Product' },
  { href: '#how-it-works', label: 'How it works' },
];
