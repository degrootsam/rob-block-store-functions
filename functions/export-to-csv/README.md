# Export to CSV

This function can be used to export data and properties from a specific data model. It is also possible to export relational (belongs-to) data up to 4 levels deep, which is the maximum depth for the Data API.

**How to configure all options:**

| Option                            | Description    |
| :-------------------------------- |:---------------|
| Model to export records from      | Select the model from which you want to export the data. |
| Filter                            | The filter allows you to reduce the size of the dataset that will be exported. It is also possible to use variables inside the filter. <br><br> Let's say we want to export all records of type "Account" from a model that saves all kinds of logging, and we want to make use of a variable inside the filter. The filter in this case could be: `type: { eq: "{{ type_variable }}" }`. <br> Leave this option blank if you want to export all data from a specific model. |
| Variables                         | The variables to be used in the filter option. The key should match the variable name you have defined inside the curly brackets. From the example above, the key should be `type_variable` and as value you can select the variable. |
| Delimiter                         | Select a delimiter, in most cases this will be ",". The delimiter is used to separate the values. |
| Model to save CSV into            | Select the model in which you want to save the exported CSV file. |
| Property to save CSV into         | Select the file property in which you want to save the exported CSV file. The property option is dependant on the model you have selected in the option "Model to save CSV into". |
| File name                         | Provide the name of the exported file. |
| Properties mapping                | The "key" represents the column name in the exported file. The "value" should be the database name of the property in snake_case. For belongs-to relations use the database relation name annotation for both the relation and the property name separated by a dot. <br><br> Some examples: <table><thead><tr><th>KEY</th><th>VALUE</th></thead> <tbody><tr><td>Identifier</td><td>id</td></tr> <tr><td>Created at</td><td>created_at</td></tr> <tr><td>Property name</td><td>relation_model_name.property_name</td></tr> </tbody></table> |
| Date formatting                   | The "key" represents the value of the column name used in the Properties mapping section. The "value" should be the format you want to use. The most common options are: <table><thead><tr><td>Unit</td><td>Pattern</td><td>Result example</td></tr><thead><body><tr><td>Year</td><td>yyyy</td><td>1998, 2023, 2024</td></tr><tr><td></td><td>yy</td><td>98, 23, 24</td></tr><tr><td>Month</td><td>M</td><td>1, 2, ..., 12</td></tr><tr><td></td><td>MM</td><td>01, 02, ..., 12</td></tr><tr><td></td><td>MMM</td><td>Jan, Feb, ..., Dec</td></tr><tr><td>Day of month</td><td>d</td><td>1, 2, ..., 31</td></tr><tr><td></td><td>dd</td><td>01, 02, ..., 31</td></tr><tr><td>Hour [0-23]</td><td>H</td><td>0, 1, 2, ..., 23</td></tr><tr><td></td><td>HH</td><td>00, 01, 02, ..., 23</td></tr><tr><td>Minute</td><td>m</td><td>0, 1, ..., 59</td></tr><tr><td></td><td>mm</td><td>00, 01, ..., 592</td></tr><tr><td>Second</td><td>s</td><td>0, 1, ..., 59	</td></tr><tr><td></td><td>ss</td><td>00, 01, ..., 59</td></tr></tbody></table> For an extended documentation with all formats you can use, see: https://date-fns.org/v2.16.1/docs/format
| Use BOM                           | If true, a BOM character will be added to the start of the CSV file to improve interoperability with programs interacting with CSV.
| As                                | The name you want to give the result variable. The result will be a file reference (not to be confused with an asset URL!). The file reference should then be stored in the appropriate file property.

> ⚠️ **IMPORTANT AFTER CONFIGURATION** ⚠️ <br>
> Drag a "Create Record" or "Update Record" function onto the canvas and select the same model previously selected in the "Model to save CSV into" option and assign the result variable from the "Export to CSV" step to the file property selected as "Property to save CSV into". The "Export to CSV" function only returns a file reference and does not store it by default.
