import { ExportToCsv } from "export-to-csv";

const snakeToCamel = (str) => {
  str = str.replace(/_[0-9]/g, (m, chr) => "!" + m);
  str = str.replace(/[^a-zA-Z0-9!]+(.)/g, (m, chr) => chr.toUpperCase());
  return str.replace(/[!]/g, "_");
};

const getAllRecords = async (gqlQuery, skip, take, results) => {
  const gqlResponse = await gql(gqlQuery, { skip, take });

  if (gqlResponse) {
    const gqlQueryObject = Object.values(gqlResponse)[0]; // The data object
    const tmpResults = Object.values(gqlQueryObject)[0]; // The all query object which contains the results and totalcount
    skip += take;
    if (tmpResults.results.length) {
      const newResults = [...results, ...tmpResults.results];
      results = newResults;
      if (skip <= tmpResults.totalCount) {
        results = await getAllRecords(gqlQuery, skip, take, results);
      }
    }
  }

  return results;
};

const renameKeys = (keysMap, obj) =>
  Object.keys(obj).reduce(
    (acc, key) => ({
      ...acc,
      ...{ [keysMap[key] || key]: obj[key] },
    }),
    {}
  );

const exportToCsv = async ({
  modelSource: { name: modelNameSource },
  delimiter: fieldSeparator,
  modelTarget: { name: modelNameTarget },
  propertyTarget: [{ name: propertyNameTarget }],
  exportPropertyMapping,
  useBom,
}) => {
  const gqlPropertyNames = exportPropertyMapping.map(({ value }) =>
    snakeToCamel(value)
  );

  const query = `
    query {
      all${modelNameSource}(skip: $skip, take: $take) {
        results {
          ${gqlPropertyNames.join(" ")}
        }
        totalCount
      }
    }
  `;

  const exportData = await getAllRecords(query, 0, 200, []);

  const exportColumnNames = exportPropertyMapping.reduce(
    (acc, { key, value }) => ({
      ...acc,
      ...{ [snakeToCamel(value)]: key },
    }),
    {}
  );

  const exportDataWithColumnNamesOrdered = exportData.map((obj) => {
    const renamedObj = renameKeys(exportColumnNames, obj);
    return Object.values(exportColumnNames).reduce(
      (acc, curr) => ({
        ...acc,
        ...{ [curr]: renamedObj[curr] },
      }),
      {}
    );
  });

  const reference = await storeFile(modelNameTarget, propertyNameTarget, {
    contentType: "text/csv",
    extension: "csv",
    fileName: `${modelNameSource.toLowerCase()}-export`,
    fileBuffer: stringToBuffer(
      new ExportToCsv({
        fieldSeparator,
        quoteStrings: '"',
        decimalSeparator: ".",
        showLabels: true,
        showTitle: false,
        useTextFile: false,
        useBom,
        useKeysAsHeaders: true,
      }).generateCsv(exportDataWithColumnNamesOrdered, true)
    ),
  });

  return {
    reference,
  };
};

export default exportToCsv;
