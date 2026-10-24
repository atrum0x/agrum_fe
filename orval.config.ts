import { defineConfig } from 'orval';

export default defineConfig({
  agrumApi: {
    input: {
      target: 'http://localhost:8080/v3/api-docs',
    },
    output: {
      mode: 'tags-split',
      target: './src/api/generated/endpoints',
      schemas: './src/api/generated/models',
      client: 'react-query',
      override: {
        mutator: {
          path: './src/api/custom-fetch.ts',
          name: 'customFetch',
        },
        operations: {
          getGrantedProjections: {
            paramsSerializer: {
              path: './src/api/params-serializer.ts',
              name: 'serializeQueryParams',
            },
          },
          getUnassignedProjections: {
            paramsSerializer: {
              path: './src/api/params-serializer.ts',
              name: 'serializeQueryParams',
            },
          },
          searchWeights: {
            paramsSerializer: {
              path: './src/api/params-serializer.ts',
              name: 'serializeQueryParams',
            },
          },
          searchMyWeights: {
            paramsSerializer: {
              path: './src/api/params-serializer.ts',
              name: 'serializeQueryParams',
            },
          },
        },
      },
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
});