const deleteMany = async ({ collection, modelName }) => {
  try {
    const { data } = collection;
    const ids = data.map((item) => item.id);

    const mutationName = `deleteMany${modelName}`;
    const mutation = `
        mutation {
          ${mutationName}(input: $input) {
            id
          }
        }
      `;

    const { errors } = await gql(mutation, { input: { ids } });

    if (errors) {
      throw errors;
    }

    return {
      result: "Many records deleted",
    };
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("One record could not be found");
    } else {
      throw error;
    }
  }
};

export default deleteMany;
