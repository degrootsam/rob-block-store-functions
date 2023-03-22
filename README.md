# export-to-csv

This function can be used to export data and properties from a specific model. It's not possible to export relational data via this step.

You can configure it with the following steps:

1. MODEL EXPORT - Fill in the model from which you want to export the data.
2. PLAYGROUND URL - Fill in the link to the playground of your application. For example "https://login-flow-joeri.betty.app/api/runtime/ad7b3bbd8c0544da8fc4090ff3608ebb"
3. DELIMITER - Select a delimiter, in most cases this is ",".
4. MODEL TO SAVE CSV INTO - Select here the model on which you want to save the csv.
5. PROPERTY - Select a file property.
6. PROPERTIES TO EXPORT - Type here all the properties which you want to export devided by a whitespace (id name createdAt).
7. WEBUSER JWT TOKEN - To access the data you need to set the JWT Token of the logged in webuser.
8. Drag a new "CREATE RECORD" function on the canvas. Select the export model and assign the result from the export-to-csv step to the file property.

NOTE: MAKE SURE THE APP IS NOT ON PRIVATE DATA MODE.
