/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    localPatterns: [
      { pathname: "/wardrobe/**" },
      { pathname: "/style-seed/**" },
    ],
  },
};

export default nextConfig;
