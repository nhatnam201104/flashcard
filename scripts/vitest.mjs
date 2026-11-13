// Launches the vitest CLI from a canonical working directory.
//
// On Windows a shell can report the cwd with a lower-case drive letter (e:\)
// while Node resolves modules with an upper-case one (E:\). Vitest then loads
// its runtime twice and every `describe` crashes with
// "Cannot read properties of undefined (reading 'config')".
// realpathSync.native returns the canonical casing; worker processes inherit it.
import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

process.chdir(realpathSync.native(process.cwd()));

const require = createRequire(join(process.cwd(), 'package.json'));
const pkgPath = require.resolve('vitest/package.json');
const { bin } = require(pkgPath);
const binFile = typeof bin === 'string' ? bin : bin.vitest;
await import(pathToFileURL(join(dirname(pkgPath), binFile)).href);
