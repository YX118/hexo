import { join } from 'path';
import { exists, readFile, listDir } from 'hexo-fs';
import Promise from 'bluebird';
import { magenta } from 'picocolors';
import type Hexo from './index';

export = (ctx: Hexo): Promise<void[][]> => {
  if (!ctx.env.init || ctx.env.safe) return;

  return loadModules(ctx).then(() => loadScripts(ctx));
};

function loadModuleList(ctx: Hexo, basedir: string): Promise<Record<string, string>> {
  const packagePath = join(basedir, 'package.json');

  // Make sure package.json exists
  return exists(packagePath).then(exist => {
    if (!exist) return [];

    // Read package.json and find dependencies
    return readFile(packagePath).then(content => {
      const json = JSON.parse(content);
      const deps = Object.keys(json.dependencies || {});
      const devDeps = Object.keys(json.devDependencies || {});

      return basedir === ctx.base_dir ? deps.concat(devDeps) : deps;
    });
  }).filter((name: string) => {
    // Ignore plugins whose name is not started with "hexo-"
    if (!/^hexo-|^@[^/]+\/hexo-/.test(name)) return false;

    // Ignore plugin whose name is started with "hexo-theme"
    if (/^hexo-theme-|^@[^/]+\/hexo-theme-/.test(name)) return false;

    // Ignore typescript definition file that is started with "@types/"
    if (name.startsWith('@types/')) return false;

    // Make sure the plugin exists
    const path = ctx.resolvePlugin(name, basedir);
    return exists(path);
  }).then((modules: string[]) => {
    return Object.fromEntries(modules.map(name => [name, ctx.resolvePlugin(name, basedir)]));
  });
}

function loadModules(ctx: Hexo): Promise<void[]> {
  return Promise.map([ctx.base_dir, ctx.theme_dir], basedir => loadModuleList(ctx, basedir))
    .then(([hexoModuleList, themeModuleList]) => {
      return Object.entries(Object.assign(themeModuleList, hexoModuleList));
    })
    .map(([name, path]) => {
      // Load plugins
      return ctx.loadPlugin(path as string).then(() => {
        ctx.log.debug('Plugin loaded: %s', magenta(name));
      }).catch(err => {
        ctx.log.error({err}, 'Plugin load failed: %s', magenta(name));
      });
    });
}

function loadScripts(ctx: Hexo): Promise<void[][]> {
  const baseDirLength = ctx.base_dir.length;

  return Promise.filter([
    ctx.theme_script_dir,
    ctx.script_dir
  ], scriptDir => { // Ignore the directory if it does not exist
    return scriptDir ? exists(scriptDir) : false;
  }).map(scriptDir => listDir(scriptDir).map(name => {
    const path = join(scriptDir, name);

    return ctx.loadPlugin(path).then(() => {
      ctx.log.debug('Script loaded: %s', displayPath(path, baseDirLength));
    }).catch(err => {
      ctx.log.error({err}, 'Script load failed: %s', displayPath(path, baseDirLength));
    });
  }));
}

function displayPath(path: string, baseDirLength: number): string {
  return magenta(path.substring(baseDirLength));
}
