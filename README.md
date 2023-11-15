## Application Details
|               |
| ------------- |
|**Generation Date and Time**<br>Sun Feb 26 2023 16:42:53 GMT-0500 (hora estándar de Perú)|
|**App Generator**<br>@sap/generator-fiori-freestyle|
|**App Generator Version**<br>1.7.4|
|**Generation Platform**<br>Visual Studio Code|
|**Floorplan Used**<br>1worklist|
|**Service Type**<br>OData Url|
|**Service URL**<br>https://services.odata.org/v2/northwind/northwind.svc/
|**Module Name**<br>createinvoice|
|**Application Title**<br>Ordenes de Compra|
|**Namespace**<br>usil.com|
|**UI5 Theme**<br>sap_horizon|
|**UI5 Version**<br>1.109.3|
|**Enable Code Assist Libraries**<br>False|
|**Add Eslint configuration**<br>True, see https://www.npmjs.com/package/eslint-plugin-fiori-custom for the eslint rules.|
|**Object collection**<br>Orders|
|**Object collection key**<br>OrderID|
|**Object ID**<br>OrderID|
|**Object number**<br>Freight|
|**Object unit of measure**<br>OrderDate|

## createinvoice

A Fiori application.

### Starting the generated app

-   This app has been generated using the SAP Fiori tools - App Generator, as part of the SAP Fiori tools suite.  In order to launch the generated app, simply run the following from the generated app root folder:

```
    npm start
```

- It is also possible to run the application using mock data that reflects the OData Service URL supplied during application generation.  In order to run the application with Mock Data, run the following from the generated app root folder:

```
    npm run start-mock
```

#### Pre-requisites:

1. Active NodeJS LTS (Long Term Support) version and associated supported NPM version.  (See https://nodejs.org)

#### Lectura XML

1. para leer la cabecera correctamente de los excels ir a la linea 18689 de la libreria xlsx.js ubicada en la ruta webapp/libs/xlsx.js (la primera linea del excel, deben ser los campos de cabecera)
