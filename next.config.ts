/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  // Un dossier index.html par page : /parcours/mes-prets/ fonctionne sur tout serveur statique,
  // sans regle de reecriture .html cote nginx.
  trailingSlash: true,
  images: {
    unoptimized: true, // Required for static exports
  },
};

module.exports = nextConfig;
