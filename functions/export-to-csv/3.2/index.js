import { ExportToCsv } from "export-to-csv";
import { parseISO, format, parse } from "date-fns";
import templayed from "../../utils/templayed";
import XLSX from "../../utils/xlsx.full.min.js";

const snakeToCamel = (str) => {
  str = str.replace(/_[0-9]/g, (m, chr) => "!" + m);
  str = str.replace(/[^a-zA-Z0-9!]+(.)/g, (m, chr) => chr.toUpperCase());
  return str.replace(/[!]/g, "_");
};

const camelToSnake = (str) => {
  if (/[A-Z]/.test(str)) {
    return str.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
  } else {
    return str;
  }
};

const getAllRecords = async (gqlQuery, skip, take, results) => {
  const gqlResponse = await gql(gqlQuery, { skip, take });

  if (gqlResponse) {
    const gqlQueryObject = Object.values(gqlResponse)[0]; // The data object
    const tmpResults = Object.values(gqlQueryObject)[0]; // The all query object which contains the results and totalcount

    if (tmpResults.totalCount === 0) {
      throw new Error("The generated query did not give any results.");
    }

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

const dataExport = async ({
  modelSource: { name: modelNameSource },
  delimiter: fieldSeparator,
  modelTarget: { name: modelNameTarget },
  propertyTarget: [{ name: propertyNameTarget }],
  exportPropertyMapping,
  formatPropertyMapping,
  useBom,
  fileName,
  filter,
  filterVariables,
  type,
}) => {
  const gqlPropertyNames = convertMappingToGraphQLQuery([
    ...exportPropertyMapping,
  ]);

  const variableMap = filterVariables.reduce((previousValue, currentValue) => {
    previousValue[currentValue.key] = currentValue.value;
    return previousValue;
  }, {});

  const getValue = (prop, obj) => {
    const exportPropKey = exportPropertyMapping.find(
      (item) => item.value === camelToSnake(prop)
    )?.key;

    const formatMapping = formatPropertyMapping.find(
      (item) => item.key === exportPropKey
    )?.value;

    const valueFormat = formatMapping && formatMapping.split("|");

    return prop.split(".").reduce((result, key) => {
      if (
        result &&
        result[key] &&
        valueFormat &&
        valueFormat[0] &&
        valueFormat[1]
      ) {
        switch (valueFormat[0].toString().toLowerCase()) {
          case "date":
            const dateValue =
              result[key].length === 10
                ? parse(result[key], "yyyy-MM-dd", new Date())
                : parseISO(result[key]);
            return format(dateValue, valueFormat[1]);
          case "decimal":
          case "price":
            return result[key]
              .toString()
              .replace(".", valueFormat[1].toString().trim());
          default:
            return result && result[key];
        }
      } else {
        return "";
      }
    }, obj);
  };

  const queryFilter =
    filter !== "" && filter !== null
      ? `where: {${templayed(filter)(variableMap)}}`
      : ``;

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
    return Object.keys(exportColumnNames).reduce((acc, curr) => {
      return {
        ...acc,
        ...{ [curr]: getValue(exportColumnNames[curr], obj, curr) },
      };
    }, {});
  });

  try {
    if (type == "csv") {
      return {
        reference: await storeFile(modelNameTarget, propertyNameTarget, {
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
        }),
      };
    } else {
      const ws = XLSX.utils.json_to_sheet(exportDataWithColumnNamesOrdered);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${modelNameTarget}`);
      return {
        reference: await storeFile(modelNameTarget, propertyNameTarget, {
          contentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          extension: "xlsx",
          fileName: `${fileName}`,
          fileBuffer: XLSX.write(wb, { bookType: "xlsx", type: "buffer" }),
        }),
      };
    }
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};
export default dataExport;
