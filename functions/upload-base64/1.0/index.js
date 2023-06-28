import { atob } from "Base64";

const parseHeaders = (headers) =>
  headers.reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {});

const decodeBase64 = (base64String) =>
  Uint8Array.from(atob(base64String), (c) => c.charCodeAt(0));

const uploadBase64 = async ({
  model: { name: modelName },
  property: [{ name: propertyName }],
  base64,
  contentType,
  name,
  fileExtension,
  headers = [],
}) => {
  const fileData = decodeBase64(base64);

  const reference = await storeFile(
    modelName,
    propertyName,
    {
      contentType: contentType,
      extension: fileExtension,
      fileBuffer: fileData.buffer,
      fileName: name,
    },
    { headers: parseHeaders(headers) }
  );

  return {
    reference,
  };
};

export default uploadBase64;
