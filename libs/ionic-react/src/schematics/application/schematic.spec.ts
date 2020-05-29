import * as ngSchematics from '@angular-devkit/schematics';
import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { Linter, readJsonInTree } from '@nrwl/workspace';
import { createEmptyWorkspace } from '@nrwl/workspace/testing';
import { join } from 'path';
import { ApplicationSchematicSchema } from './schema';

describe('application', () => {
  let appTree: Tree;

  const options: ApplicationSchematicSchema = {
    name: 'test',
    style: 'css',
    skipFormat: false,
    unitTestRunner: 'jest',
    e2eTestRunner: 'cypress',
    linter: Linter.EsLint,
    disableSanitizer: false
  };

  const projectRoot = `apps/${options.name}`;

  const testRunner = new SchematicTestRunner(
    '@nxtend/ionic-react',
    join(__dirname, '../../../collection.json')
  );

  function testGeneratedFiles(tree: Tree, options: ApplicationSchematicSchema) {
    const componentExtension = options.js ? 'js' : 'tsx';
    const appFileName = options.pascalCaseFiles ? 'App' : 'app';
    const homeFileName = options.pascalCaseFiles ? 'Home' : 'home';
    const exploreContainerFileName = options.pascalCaseFiles
      ? 'ExploreContainer'
      : 'explore-container';

    expect(tree.exists(`${projectRoot}/.eslintrc`)).toBeTruthy();
    expect(tree.exists(`${projectRoot}/src/index.html`)).toBeTruthy();
    expect(tree.exists(`${projectRoot}/src/manifest.json`)).toBeTruthy();

    expect(
      tree.exists(
        `${projectRoot}/src/app/components/${exploreContainerFileName}.${componentExtension}`
      )
    ).toBeTruthy();

    expect(
      tree.exists(
        `${projectRoot}/src/app/pages/${homeFileName}.${componentExtension}`
      )
    ).toBeTruthy();

    expect(
      tree.exists(`${projectRoot}/src/app/${appFileName}.${componentExtension}`)
    ).toBeTruthy();

    expect(
      tree.exists(`${projectRoot}/src/assets/icon/favicon.png`)
    ).toBeTruthy();
    expect(tree.exists(`${projectRoot}/src/assets/icon/icon.png`)).toBeTruthy();

    if (options.style !== 'styled-components' && options.style !== 'emotion') {
      expect(
        tree.exists(
          `${projectRoot}/src/app/components/${exploreContainerFileName}.${options.style}`
        )
      ).toBeTruthy();

      expect(
        tree.exists(
          `${projectRoot}/src/app/pages/${homeFileName}.${options.style}`
        )
      ).toBeTruthy();

      expect(
        tree.exists(`${projectRoot}/src/app/theme/variables.${options.style}`)
      ).toBeTruthy();
    }

    if (options.unitTestRunner === 'jest') {
      expect(
        tree.exists(`${projectRoot}/src/app/__mocks__/fileMock.js`)
      ).toBeTruthy();
      expect(
        tree.exists(
          `${projectRoot}/src/app/${appFileName}.spec.${componentExtension}`
        )
      ).toBeTruthy();
    }
  }

  beforeEach(() => {
    appTree = createEmptyWorkspace(Tree.empty());
  });

  it('should add dependencies to package.json', async () => {
    const tree = await testRunner
      .runSchematicAsync('application', options, appTree)
      .toPromise();

    const packageJSON = readJsonInTree(tree, 'package.json');
    expect(packageJSON.dependencies['@ionic/react-router']).toBeDefined();
  });

  it('should generate application', async () => {
    const tree = await testRunner
      .runSchematicAsync('application', options, appTree)
      .toPromise();

    testGeneratedFiles(tree, options);
  });

  it('should apply template files', async () => {
    const tree = await testRunner
      .runSchematicAsync('application', options, appTree)
      .toPromise();

    expect(
      tree.exists(
        `${projectRoot}/src/app/components/explore-container.__style__.template`
      )
    ).toBeFalsy();
    expect(
      tree.exists(
        `${projectRoot}/src/app/components/explore-container.tsx.template`
      )
    ).toBeFalsy();

    expect(
      tree.exists(`${projectRoot}/src/app/home.__style__.template`)
    ).toBeFalsy();
    expect(tree.exists(`${projectRoot}/src/app/home.tsx.template`)).toBeFalsy();

    expect(
      tree.exists(`${projectRoot}/src/app/app.spec.tsx.template`)
    ).toBeFalsy();
    expect(tree.exists(`${projectRoot}/src/app/app.tsx.template`)).toBeFalsy();

    expect(tree.exists(`${projectRoot}/src/index.html.template`)).toBeFalsy();
    expect(
      tree.exists(`${projectRoot}/src/manifest.json.template`)
    ).toBeFalsy();
  });

  it('should delete unused @nrwl/react files', async () => {
    const tree = await testRunner
      .runSchematicAsync('application', options, appTree)
      .toPromise();

    expect(tree.exists(`${projectRoot}/src/app/app.css`)).toBeFalsy();
    expect(tree.exists(`${projectRoot}/src/favicon.ico`)).toBeFalsy();
  });

  it('should update workspace.json', async () => {
    const tree = await testRunner
      .runSchematicAsync('application', options, appTree)
      .toPromise();
    const workspaceJson = readJsonInTree(tree, '/workspace.json');

    expect(
      workspaceJson.projects[options.name].architect.build.options.assets
    ).not.toContain(`${projectRoot}/src/favicon.ico`);
    expect(
      workspaceJson.projects[options.name].architect.build.options.assets
    ).toContain(`${projectRoot}/src/manifest.json`);
    expect(
      workspaceJson.projects[options.name].architect.build.options.webpackConfig
    ).toEqual('@nxtend/ionic-react/plugins/webpack');

    expect(
      workspaceJson.schematics['@nxtend/ionic-react'].application.style
    ).toEqual('css');
    expect(
      workspaceJson.schematics['@nxtend/ionic-react'].application.linter
    ).toEqual('eslint');
    expect(
      workspaceJson.schematics['@nxtend/ionic-react'].component.style
    ).toEqual('css');
    expect(
      workspaceJson.schematics['@nxtend/ionic-react'].library.style
    ).toEqual('css');
    expect(
      workspaceJson.schematics['@nxtend/ionic-react'].library.linter
    ).toEqual('eslint');
  });

  describe('external schematics', () => {
    it('should call the @nrwl/react:application schematic', async () => {
      const externalSchematicSpy = jest.spyOn(
        ngSchematics,
        'externalSchematic'
      );
      await testRunner
        .runSchematicAsync('application', options, appTree)
        .toPromise();

      expect(externalSchematicSpy).toBeCalledWith(
        '@nrwl/react',
        'application',
        expect.objectContaining({
          routing: true,
          unitTestRunner: 'none',
          skipWorkspaceJson: true
        })
      );
    });

    it('should call the @nrwl/jest:jest-project schematic', async () => {
      const externalSchematicSpy = jest.spyOn(
        ngSchematics,
        'externalSchematic'
      );
      await testRunner
        .runSchematicAsync('application', options, appTree)
        .toPromise();

      expect(externalSchematicSpy).toBeCalledWith(
        '@nrwl/jest',
        'jest-project',
        expect.objectContaining({
          supportTsx: true,
          skipSerializers: true,
          setupFile: 'web-components'
        })
      );
    });
  });

  describe('--js', () => {
    describe('true', () => {
      it('should generate JavaScript files', async () => {
        const tree = await testRunner
          .runSchematicAsync('application', { ...options, js: true }, appTree)
          .toPromise();

        expect(tree.exists(`${projectRoot}/src/app/app.js`)).toBeTruthy();
        expect(tree.exists(`${projectRoot}/src/main.js`)).toBeTruthy();

        expect(tree.exists(`${projectRoot}/src/app/app.tsx`)).toBeFalsy();
        expect(tree.exists(`${projectRoot}/src/main.tsx`)).toBeFalsy();

        testGeneratedFiles(tree, { ...options, js: true });
      });
    });
  });

  describe('--pascalCaseFiles', () => {
    describe('true', () => {
      it('should generate pascal case file names', async () => {
        const tree = await testRunner
          .runSchematicAsync(
            'application',
            { ...options, pascalCaseFiles: true },
            appTree
          )
          .toPromise();

        testGeneratedFiles(tree, { ...options, pascalCaseFiles: true });
      });
    });
  });

  describe('--style', () => {
    describe('scss', () => {
      it('should generate application with scss style', async () => {
        const style = 'scss';
        const tree = await testRunner
          .runSchematicAsync('application', { ...options, style }, appTree)
          .toPromise();

        testGeneratedFiles(tree, { ...options, style });
      });
    });

    describe('styled-components', () => {
      it('should generate application with styled-components style', async () => {
        const style = 'styled-components';
        const tree = await testRunner
          .runSchematicAsync('application', { ...options, style }, appTree)
          .toPromise();

        testGeneratedFiles(tree, { ...options, style });
      });
    });
  });

  describe('--unitTestRunner', () => {
    describe('jest', () => {
      it('should update Jest config', async () => {
        const tree = await testRunner
          .runSchematicAsync('application', options, appTree)
          .toPromise();
        const workspaceJson = readJsonInTree(tree, '/workspace.json');
        const jestConfigPath =
          workspaceJson.projects['test'].architect.test.options.jestConfig;
        const jestConfig = tree.readContent(jestConfigPath);

        expect(jestConfig).toContain('moduleNameMapper');
        expect(jestConfig).toContain('modulePathIgnorePatterns:');
      });

      it('should generate Jest test setup', async () => {
        const tree = await testRunner
          .runSchematicAsync('application', options, appTree)
          .toPromise();
        const workspaceJson = readJsonInTree(tree, '/workspace.json');

        expect(
          workspaceJson.projects[options.name].architect.build.options.assets
        ).toContain(`${projectRoot}/src/manifest.json`);

        expect(tree.exists(`${projectRoot}/src/test-setup.ts`)).toBeTruthy();
        expect(
          tree.exists(`${projectRoot}/src/test-setup.ts.template`)
        ).toBeFalsy();
      });
    });

    describe('none', () => {
      it('should not generate Jest mocks', async () => {
        const tree = await testRunner
          .runSchematicAsync(
            'application',
            { ...options, unitTestRunner: 'none' },
            appTree
          )
          .toPromise();

        testGeneratedFiles(tree, { ...options, unitTestRunner: 'none' });
      });

      it('should not generate test files', async () => {
        const tree = await testRunner
          .runSchematicAsync(
            'application',
            { ...options, unitTestRunner: 'none' },
            appTree
          )
          .toPromise();

        expect(tree.exists(`${projectRoot}/src/app/app.spec.tsx`)).toBeFalsy();
        testGeneratedFiles(tree, { ...options, unitTestRunner: 'none' });
      });
    });
  });

  describe('--e2eTestRunner', () => {
    describe('cypress', () => {
      it('should add Cypress Testing Library dependency', async () => {
        const tree = await testRunner
          .runSchematicAsync('application', options, appTree)
          .toPromise();

        const packageJson = readJsonInTree(tree, 'package.json');
        expect(
          packageJson.devDependencies['@testing-library/cypress']
        ).toBeDefined();
      });

      it('should add Cypress Testing Library type to tsconfig.json', async () => {
        const tree = await testRunner
          .runSchematicAsync('application', options, appTree)
          .toPromise();

        const tsconfigJson = readJsonInTree(
          tree,
          `${projectRoot}-e2e/tsconfig.json`
        );
        expect(
          tsconfigJson.compilerOptions.types.includes(
            '@types/testing-library__cypress'
          )
        ).toBeTruthy();
      });
    });

    describe('none', () => {
      it('should not add Cypress Testing Library dependency', async () => {
        const tree = await testRunner
          .runSchematicAsync(
            'application',
            { ...options, e2eTestRunner: 'none' },
            appTree
          )
          .toPromise();

        const packageJson = readJsonInTree(tree, 'package.json');
        expect(
          packageJson.devDependencies['@testing-library/cypress']
        ).toBeFalsy();
      });

      it('should not add Cypress Testing Library type to tsconfig.json', async () => {
        const tree = await testRunner
          .runSchematicAsync(
            'application',
            { ...options, e2eTestRunner: 'none' },
            appTree
          )
          .toPromise();

        expect(tree.exists(`${projectRoot}-e2e/tsconfig.json`)).toBeFalsy();
      });
    });
  });

  describe('--disableSanitizer', () => {
    describe('true', () => {
      it('should add disable the Ionic sanitizer', async () => {
        const tree = await testRunner
          .runSchematicAsync(
            'application',
            { ...options, disableSanitizer: true },
            appTree
          )
          .toPromise();
        const appTsx = tree.readContent(`${projectRoot}/src/app/app.tsx`);

        expect(appTsx).toContain(
          `import { IonApp, IonRouterOutlet, setupConfig } from '@ionic/react';`
        );
        expect(appTsx).toContain(`sanitizerEnabled: false`);
      });
    });
  });
});
