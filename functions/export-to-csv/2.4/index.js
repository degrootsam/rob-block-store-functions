import { ExportToCsv } from "export-to-csv";
import templayed from "../../utils/templayed";

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

const getValue = (prop, obj) => {
  return prop.split(".").reduce((obj, k) => {
    return obj && obj[k];
  }, obj);
};

const parseDotSeparatedStringToObject = (str, value) => {
  const keys = str.split(".");
  const obj = {};

  let currentObject = obj;
  for (let i = 0; i < keys.length; i++) {
    const key = snakeToCamel(keys[i]);
    if (i === keys.length - 1) {
      currentObject[key] = value;
    } else {
      currentObject[key] = {};
      currentObject = currentObject[key];
    }
  }

  return obj;
};

const convertMappingToGraphQLQuery = (arr) => {
  const resultObj = {};

  for (const item of arr) {
    const { value } = item;
    const parsedObj = parseDotSeparatedStringToObject(value, null);
    mergeObjects(resultObj, parsedObj);
  }

  return generateGraphQLQuery(resultObj);
};

const mergeObjects = (target, source) => {
  for (const key in source) {
    if (typeof source[key] === "object" && source[key] !== null) {
      target[key] = target[key] || {};
      mergeObjects(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
};

const generateGraphQLQuery = (obj, indent = 0) => {
  const indentStr = " ".repeat(indent * 2);
  let query = "{\n";

  for (const key in obj) {
    query += `${indentStr}${key}`;

    if (typeof obj[key] === "object" && obj[key] !== null) {
      query += " " + generateGraphQLQuery(obj[key], indent + 1);
    }

    query += "\n";
  }

  query += `${indentStr}}`;

  return query;
};

const exportCsv = async ({
  modelSource: { name: modelNameSource },
  delimiter: fieldSeparator,
  modelTarget: { name: modelNameTarget },
  propertyTarget: [{ name: propertyNameTarget }],
  exportPropertyMapping,
  useBom,
  fileName,
  filter,
  filterVariables,
}) => {
  const gqlPropertyNames = convertMappingToGraphQLQuery([
    ...exportPropertyMapping,
  ]);

  const variableMap = filterVariables.reduce((previousValue, currentValue) => {
    previousValue[currentValue.key] = currentValue.value;
    return previousValue;
  }, {});

  const queryFilter =
    filter !== "" && filter !== null
      ? `where: {${templayed(filter)(variableMap)}}`
      : ``;

  console.log(gqlPropertyNames);

  const query = `
        query {
          all${modelNameSource}(${queryFilter} skip: $skip, take: $take) {
            results
              ${gqlPropertyNames.toString()}
            totalCount
          }
        }
      `;

  const exportData = await getAllRecords(query, 0, 200, []);

  const exportColumnNames = [...exportPropertyMapping].reduce(
    (acc, { key, value }) => ({
      ...acc,
      ...{
        [key]:
          value.split(".").length > 1
            ? value
                .split(".")
                .map((item) => snakeToCamel(item))
                .join(".")
            : snakeToCamel(value),
      },
    }),
    {}
  );

  const exportDataWithColumnNamesOrdered = exportData.map((obj) => {
    return Object.keys(exportColumnNames).reduce(
      (acc, curr) => ({
        ...acc,
        ...{ [curr]: getValue(exportColumnNames[curr], obj) },
      }),
      {}
    );
  });

  const reference = await storeFile(modelNameTarget, propertyNameTarget, {
    contentType: "text/csv",
    extension: "csv",
    fileName: `${fileName}`,
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

export default exportCsv;
