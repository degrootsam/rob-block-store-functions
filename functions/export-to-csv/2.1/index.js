import { ExportToCsv } from "export-to-csv";

const snakeToCamel = (str) => {
  str = str.replace(/_[0-9]/g, (m, chr) => "!" + m);
  str = str.replace(/[^a-zA-Z0-9!]+(.)/g, (m, chr) => chr.toUpperCase());
  return str.replace(/[!]/g, "_");
};

const getAllRecords = async (gqlQuery, skip, take, results) => {
  const gqlResponse = await gql(gqlQuery, {
    skip: skip,
    take: take,
  });
  if (gqlResponse) {
    const gqlQueryObject = Object.values(gqlResponse)[0]; // the data object
    const tmpResults = Object.values(gqlQueryObject)[0]; // the all query object which contains the result and totalcount
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

function renameObjectKeys(array, keyMap) {
  return array.map((obj) => {
    const renamedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (keyMap.hasOwnProperty(key)) {
          renamedObj[keyMap[key]] = obj[key];
        } else {
          renamedObj[key] = obj[key];
        }
      }
    }
    return renamedObj;
  });
}

const customExportFunction = async ({
  delimiter,
  useBom,
  model: { name: modelName },
  modelExport: { name: modelNameExport },
  property: [{ name: propertyName }],
  exportPropertyMappings,
}) => {
  const gqlPropertyNames = exportPropertyMappings.map((map) =>
    snakeToCamel(map.value)
  );

  const allModelNameExport = `all${modelNameExport}`;
  let query = `
    query {
      ${allModelNameExport}(skip: $skip, take: $take){
        results{
          ${gqlPropertyNames.join(" ")}
        }
        totalCount
      }
    }
  `;
  console.log(query);
  const exportData = await getAllRecords(query, 0, 200, []);

  console.log(gqlPropertyNames);
  const exportColumnNames = {};
  exportPropertyMappings.forEach((map) => {
    exportColumnNames[snakeToCamel(map.value)] = map.key;
  });

  const exportDataWithColumnNames = renameObjectKeys(
    exportData,
    exportColumnNames
  );

  return {
    reference: await storeFile(modelName, propertyName, {
      contentType: "text/csv",
      extension: "csv",
      fileName: `${modelNameExport.toLowerCase()}-export`,
      fileBuffer: stringToBuffer(
        new ExportToCsv({
          fieldSeparator: delimiter,
          quoteStrings: '"',
          decimalSeparator: ".",
          showLabels: true,
          showTitle: false,
          useTextFile: false,
          useBom: useBom,
          useKeysAsHeaders: true,
        }).generateCsv(exportDataWithColumnNames, true)
      ),
    }),
  };
};

export default customExportFunction;
