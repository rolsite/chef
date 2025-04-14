const esbuild = require('esbuild');

esbuild.buildSync({
  entryPoints: ['./proxy.cjs'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  minify: false,
  outfile: './proxy.bundled.cjs',
});
