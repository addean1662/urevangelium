import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Certification source archives are retained in Git for reproducibility, but
  // they are not read by the live Gospel route. Exclude them from the server
  // function trace so the dynamic data loader does not bundle archival corpora.
  outputFileTracingExcludes: {
    '/*': ['./data/sources/vulgate-english/**/*'],
  },
};

export default nextConfig;
