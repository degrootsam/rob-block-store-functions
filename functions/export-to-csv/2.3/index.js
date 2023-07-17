import { ExportToCsv } from "export-to-csv";
import templayed from "./templayed";

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

const reOrderProperties = (unOrdererprops) => {
  let orderedPropMapping = [];
  unOrdererprops.map((prop, index) => {
    const isRelation = prop.value.includes(".");

    if (isRelation) {
      const [relationalModel, nestedProp] = prop.value.split(".");

      const existingProp = orderedPropMapping.find(
        (item) => item.value.split(".")[0] === relationalModel
      );

      if (existingProp) {
        existingProp.RelationValue = `${existingProp.value} ${nestedProp}`;
      }
    }
    orderedPropMapping.push({
      ...prop,
      index,
      isRelation,
    });
  });

  return orderedPropMapping;
};

const prepareRelationMappings = (propertyMapping) => {
  const propertyQuery = [];

  for (const mapping of propertyMapping) {
    if (mapping.isRelation && mapping.RelationValue) {
      const [relationModelName, propertyNames] =
        mapping.RelationValue.split(".");
      if (relationModelName && propertyNames) {
        propertyQuery.push(
          `${snakeToCamel(relationModelName)}{${propertyNames
            .split(" ")
            .map((prop) => snakeToCamel(prop))
            .join(" ")}}`
        );
      }
    } else if (mapping.isRelation === false) {
      propertyQuery.push(snakeToCamel(mapping.value));
    }
  }

  return propertyQuery;
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
  const reOrderedPropertyMappings = reOrderProperties([
    ...exportPropertyMapping,
  ]);

  const gqlPropertyNames = prepareRelationMappings(reOrderedPropertyMappings);

  const variableMap = filterVariables.reduce((previousValue, currentValue) => {
    previousValue[currentValue.key] = currentValue.value;
    return previousValue;
  }, {});

  const queryFilter =
    filter !== "" && filter !== null
      ? `where: {${templayed(filter)(variableMap)}}`
      : ``;

  const query = `
        query {
          all${modelNameSource}(${queryFilter} skip: $skip, take: $take) {
            results {
              ${gqlPropertyNames.join(" ")}
            }
            totalCount
          }
        }
      `;

  const exportData = await getAllRecords(query, 0, 200, []);

  const exportColumnNames = reOrderedPropertyMappings.reduce(
    (acc, { key, value, isRelation }) => ({
      ...acc,
      ...{
        [key]: isRelation
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
