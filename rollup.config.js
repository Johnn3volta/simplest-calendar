import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';
import html from '@rollup/plugin-html';
import scss from 'rollup-plugin-scss';

// FIXME: Разобраться с путями css, js
const commonPlugins = [resolve(), scss({ output: 'css/style.css' }), terser()];

/**
 * @param attributes
 * @return {string}
 */
const makeHtmlAttributes = attributes => {
  if (!attributes) {
    return '';
  }
  const keys = Object.keys(attributes);
  return keys.reduce((result, key) => (result += ` ${key}="${attributes[key]}"`), '');
};

/**
 * @param title
 * @param files
 * @return {Promise<string>}
 */
const createTemplate = async ({ title = 'Rollup Dev Title', files }) => {
  const scripts = (files.js || [])
    .map(script => {
      const attrs = makeHtmlAttributes(script.attributes);
      const { fileName } = script;
      return `<script src="${fileName}" ${attrs} defer></script>`;
    })
    .join('\n');

  const links = (files.css || [])
    .map(link => {
      const attrs = makeHtmlAttributes(link.attributes);
      const { fileName } = link;
      return `<link href="${fileName}" rel="stylesheet" ${attrs} >`;
    })
    .join('\n');

  return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        ${links}
      </head>
    <body>
    <div id="app"></div>
      ${scripts}
    </body>
    </html>`;
};

/**
 * @type {(Plugin|{generateBundle: function(): void, name: string}|{generateBundle(): Promise<void>, name: string, banner(): Promise<string>})[]}
 */
const devPlugins = [
  html({
    input: './src/index.html',
    template: async () =>
      await createTemplate({
        title: 'Rollup Dev Title',
        files: {
          js: [
            { fileName: pkg.browser, attributes: { type: 'module' } },
            {
              fileName: 'dev.js',
            },
          ],
        },
      }),
  }),
  serve({
    openPage: 'dev/index.html',
    port: 3003,
    contentBase: ['dev'],
  }),
  livereload({
    watch: 'dev',
  }),
];

/**
 * @param path
 * @return {[{file: string, name: string, format: string}]}
 */
const commonOutput = path => [
  {
    name: 'SimplestCalendar',
    file: `${path}/js/${pkg.name}.umd.js`,
    format: 'umd',
  },
];

/**
 * @param path
 * @return {[{file: string, exports: string, format: string}, {file: string, format: string}, {file: string, name: string, format: string}]}
 */
const prodOutput = path => [
  {
    file: `${path}/${pkg.name}.cjs.js`,
    format: 'cjs',
    exports: 'default',
  },
  {
    file: `${path}/${pkg.name}.esm.js`,
    format: 'esm',
  },
  ...commonOutput(path),
];

/**
 * @param dev
 * @return {Plugin[]}
 */
const getPlugins = dev => (dev ? commonPlugins.concat(devPlugins) : commonPlugins);

/**
 * @param dev
 * @param path
 * @return {({file: string, exports: string, format: string}|{file: string, format: string}|{file: string, name: string, format: string})[]}
 */
const getOutput = (dev, path) => (dev ? commonOutput(path) : prodOutput(path));

/**
 * @param env
 * @return {{output: ({file: string, exports: string, format: string}|{file: string, format: string}|{file: string, name: string, format: string})[], input: string, plugins: Plugin[]}}
 */
export default env => {
  const { environment } = env;
  const dev = environment === 'dev';
  const folder = dev ? 'dev' : 'dist';
  const devJSOutput = {
    input: 'src/dev.ts',
    output: [
      {
        file: `dev/js/dev.js`,
        format: 'es',
      },
    ],
  };
  const prodJSOutput = {
    input: 'src/index.ts',
    output: getOutput(dev, folder),
    plugins: getPlugins(dev),
  };

  return dev ? [devJSOutput, prodJSOutput] : prodJSOutput;
};
