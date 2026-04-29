import { execSync } from "child_process";

let buildId = "dev";
try {
  buildId = execSync("git rev-parse --short HEAD").toString().trim();
} catch {
  // not in a git repo
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    localPatterns: [
      { pathname: "/wardrobe/**" },
      { pathname: "/style-seed/**" },
    ],
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  env: {
    NEXT_PUBLIC_BUILD_ID: buildId,
  },
};

export default nextConfig;
