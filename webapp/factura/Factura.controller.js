sap.ui.define([
    "../controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "sap/m/MessageBox",
    "../model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (
    BaseController,
    JSONModel,
    History,
    MessageBox,
    formatter,
    Filter,
    FilterOperator
) {
    "use strict";
    let MODEL,
        nuevafacturaModel,
        facturaModel,
        ODATA_SAP;
    return BaseController.extend("usil.com.createinvoice.factura.Factura", {

        formatter: formatter,

        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

        /**
         * Called when the worklist controller is instantiated.
         * @public
         */
        onInit: function () {
            // Model used to manipulate control states. The chosen values make sure,
            // detail page shows busy indication immediately so there is no break in
            // between the busy indication for loading the view's meta data
            nuevafacturaModel = new JSONModel({
                busy: true,
                delay: 0,
                isEnabledCabecera: true,
                isBtnPosicionesEnabled: false
                // facturaViewTitle: this.getResourceBundle().getText("facturaViewTitleCreate")
            });
            this.getRouter().getRoute("factura").attachPatternMatched(this._onFacturaMatched, this);
            this.setModel(nuevafacturaModel, "facturaView");
            MODEL = this.getOwnerComponent().getModel();
            facturaModel = this.getOwnerComponent().getModel("facturaModel");
            ODATA_SAP = this.getOwnerComponent().getModel("ODATA_SAP");
        },
        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */


        /**
         * Event handler  for navigating back.
         * It there is a history entry we go one step back in the browser history
         * If not, it will replace the current entry of the browser history with the worklist route.
         * @public
         */
        onNavBack: function () {
            var sPreviousHash = History.getInstance().getPreviousHash();
            if (sPreviousHash !== undefined) {
                // eslint-disable-next-line sap-no-history-manipulation
                history.go(-1);
            } else {
                this.getRouter().navTo("solicitudes", {}, true);
            }
        },

        onNavOrdenes: function () {
            this.getRouter().navTo("orden", {}, false);
        },

        onNavSolicitudes: function () {
            this.getRouter().navTo("solicitudes", {}, false);
            MODEL.setProperty("/Factura", {});
        },

        onUpdateFinished: function (oEvent) {
            // update the worklist's object counter after the table update
            var sTitle,
                oTable = oEvent.getSource(),
                iTotalItems = oEvent.getParameter("total");
            // only update the counter if the length is final and
            // the table is not empty
            if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
                sTitle = this.getResourceBundle().getText("facturaTableTitleCount", [iTotalItems]);
            } else {
                sTitle = this.getResourceBundle().getText("facturaTableTitle");
            }
            nuevafacturaModel.setProperty("/facturaTableTitle", sTitle);
        },


        /**
         * Manejador de evento Actulizacion de Lista Adjuntos finalizada
         * @param {sap.ui.base.Event} event 
         */
        onUpdateFinishedAdjuntos: function (event) {
            const total = event.getParameter("total");
            const lista = event.getSource();
            let title = this.getResourceBundle().getText("tituloListaAdjuntos");
            if (total && lista.getBinding("items").isLengthFinal()) {
                title = this.getResourceBundle().getText("tituloListaAdjuntosCount", [total]);
            }
            nuevafacturaModel.setProperty("/tituloListaAdjuntos", title);
        },

        onImportarArchivoXml: async function (event) {
            const files = event.getParameter("files");
            const fileUploader = event.getSource();
            if (files.length > 0) {
                const file = files[0];
                const dataXml = await this._readFiles(file);
                if (!dataXml.invoice) {
                    MessageBox.error(`El archivo xml no cumple con el formato requerido`);
                    fileUploader.setValue("");
                    return;
                }
                const invoice = dataXml.invoice;
                let version = invoice.ublversionid;
                version = parseFloat(version);
                if (version <= 2.0) {
                    MessageBox.error(`La version ${version} no es compatible, se requiere 2.0 o superior`);
                    fileUploader.setValue("");
                    return;
                }

                let aFactura = MODEL.getProperty("/Facturas");
                let oFindFactura = aFactura.find(oPos => oPos.XBLNR == invoice.id);
                if (oFindFactura) {
                    MessageBox.error(`La factura ya ha sido registrada. Por favor, ingresar otra factura.`);
                    fileUploader.setValue("");
                    return;
                }

                const datosFactura = {
                    version: invoice.ublversionid,
                    numeroSerie: invoice.id,
                    fechaEmision: invoice.issuedate,
                    fechaVencimiento: invoice.paymentterms.paymentduedate,
                    tipoDocumento: invoice.invoicetypecode,
                    tipoMoneda: invoice.documentcurrencycode,
                    rucEmisor: invoice.accountingsupplierparty.party.partyidentification.id,
                    nombreComercialEmisor: invoice.accountingsupplierparty.party.partyidentification.id,
                    numeroDocumentoReceptor: invoice.accountingcustomerparty.party.partyidentification.id,
                    tipoDocumentoReceptor: "",
                    nombresReceptor: invoice.accountingcustomerparty.party.partylegalentity.registrationname,
                    unidadMedida: "",
                    cantidad: invoice.invoiceline.invoicedquantity,
                    codigoProducto: invoice.invoiceline.item.sellersitemidentification.id,
                    codigoProductoSunat: "",
                    descripcionItem: invoice.invoiceline.item.description,
                    precioUnitario: invoice.invoiceline.price.priceamount,
                    igvItem: invoice.invoiceline.taxtotal.taxamount,
                    valorVentaItem: invoice.invoiceline.pricingreference.alternativeconditionprice.priceamount,
                    descuentoItem: false,
                    totalValorVenta: "",
                    totalDescuentos: "",
                    sumatoriaIgv: invoice.taxtotal.taxamount,
                    importe: invoice.taxtotal.taxsubtotal.taxableamount, ///
                    total: invoice.legalmonetarytotal.payableamount,
                    sociedad: "3000"
                };

                MODEL.setProperty("/facturaXml", datosFactura);
                // nuevafacturaModel.setProperty("/isBtnPosicionesEnabled", true);
                // if(!dataExcel[0][campoBusqueda]){
                //     MODEL.setProperty("/listaImportada",[]);
                //     const nombresColumna = Object.keys(dataExcel[0]);
                //     fileUploader.setValue("");
                //     fileUploader.setValueState("Error");
                //     fileUploader.setValueStateText(`Nombre de columna ${nombresColumna[0]} no es correcto: Intente con ${campoBusqueda}`);
                //     return;
                // }
                // fileUploader.setValueState("Success");
                // const data = dataExcel.map( (item) => {
                //     return {
                //         valor: item[campoBusqueda]
                //     }
                // });
                const fechaEmisionView = formatter.formatDateImportacion(datosFactura.fechaEmision);
                const fechaEmisionParamenter = formatter.formatDateParameter(fechaEmisionView);
                MODEL.setProperty("/Factura/codigoFactura", datosFactura.numeroSerie);
                MODEL.setProperty("/Factura/fechaEmision", fechaEmisionView);
                MODEL.setProperty("/Factura/fechaEmisionParameter", fechaEmisionParamenter);
                MODEL.setProperty("/Factura/importe", datosFactura.importe);
                MODEL.setProperty("/Factura/total", datosFactura.total);
                MODEL.setProperty("/Factura/sociedad", datosFactura.sociedad);

                nuevafacturaModel.setProperty("/isEnabledCabecera", false);
                MODEL.setProperty("/Factura/estado", "No validado");
                MODEL.setProperty("/Factura/estadoState", "Information");
                MODEL.setProperty("/Factura/estadoIcon", "sap-icon://information");
                MODEL.setProperty("/Factura/estadoCp", "");
                // this._destroyMessageStrip();
            }
        },
        onClearArchivoXml: function (event) {
            MODEL.setProperty("/facturaXml", {});
            MODEL.setProperty("/Factura/codigoFactura", "");
            MODEL.setProperty("/Factura/fechaEmision", "");
            MODEL.setProperty("/Factura/fechaEmisionParameter", "");
            MODEL.setProperty("/Factura/importe", "");
            MODEL.setProperty("/Factura/total", "");
            MODEL.setProperty("/Factura/sociedad", "");
            MODEL.setProperty("/Factura/estado", "");
            MODEL.setProperty("/Factura/estadoState", "None");
            MODEL.setProperty("/Factura/estadoIcon", "");
            MODEL.setProperty("/Factura/estadoCp", "");
            nuevafacturaModel.setProperty("/isEnabledCabecera", true);
            nuevafacturaModel.setProperty("/isBtnPosicionesEnabled", false);

            const fileUploader = this.getView().byId("fileUploader");
            fileUploader.setValue("");
        },
        onValidarArchivoXml: function (event) {
            nuevafacturaModel.setProperty("/isEnabledCabecera", false);
            var that = this;
            that.onValidateComprobante();
        },
        onValidateComprobante: async function () {
            var that = this;
            var oDataFacturaXml = MODEL.getProperty("/facturaXml");
            var that = this;
            try {
                sap.ui.core.BusyIndicator.show(0);
                var aresuult = await that.onValidateSunatConsultaApi(oDataFacturaXml);
                sap.ui.core.BusyIndicator.hide();
                if (aresuult.success) {
                    var estadoName = "No validado";
                    var estadoState = "Information";
                    var estadoIcon = "sap-icon://information";

                    switch (aresuult.data.estadoCp) {
                        case "0":
                            estadoName = "No existe";
                            estadoState = "Warning";
                            estadoIcon = "sap-icon://alert";

                            MessageBox.error(`Archivo xml ${estadoName} en SUNAT`);
                            break;
                        case "1":
                            estadoName = "Aceptado";
                            estadoState = "Success";
                            estadoIcon = "sap-icon://sys-enter-2";
                            nuevafacturaModel.setProperty("/isBtnPosicionesEnabled", true);
                            MessageBox.success(`Archivo xml ${estadoName} en SUNAT`);
                            break;
                        case "2":
                            estadoName = "Anulado";
                            estadoState = "Error";
                            estadoIcon = "sap-icon://error";
                            break;
                        case "3":
                            estadoName = "Autorizado";
                            estadoState = "Information";
                            estadoIcon = "sap-icon://unlocked";
                            MessageBox.success(`Archivo xml ${estadoName} en SUNAT`);
                            break;
                        case "4":
                            estadoName = "No autorizado";
                            estadoState = "None";
                            estadoIcon = "sap-icon://locked";
                            MessageBox.error(`Archivo xml ${estadoName} en SUNAT`);
                            break;
                        default:
                            var estadoName = "";
                            var estadoState = "None";
                            var estadoIcon = "";
                            MessageBox.error(`El archivo xml no es válido por SUNAT`);
                            break;
                    }

                    MODEL.setProperty("/Factura/estado", estadoName);
                    MODEL.setProperty("/Factura/estadoState", estadoState);
                    MODEL.setProperty("/Factura/estadoIcon", estadoIcon);
                    MODEL.setProperty("/Factura/estadoCp", aresuult.data.estadoCp);


                } else {
                    MessageBox.error(`El archivo xml no es válido o autorizado por SUNAT`);
                    sap.ui.core.BusyIndicator.hide();
                }
            } catch (error) {
                MessageBox.error(`Ocurrió un error al realizar la validación con SUNAT.`);
                sap.ui.core.BusyIndicator.hide();
            }
        },
        onValidateSunatConsultaApi: async function (oDataFacturaXml) {
            var that = this;
            var sResultToken = await that.onGetTokenSunatSeguridadApi();
            var appId = that._getAppModulePath();
            // var apiUrls = appId + "/v1/contribuyente/contribuyentes/" + oDataFacturaXml.numeroDocumentoReceptor + "/validarcomprobante";
            var apiUrls = appId + "/apisunatconsulta/v1/contribuyente/contribuyentes/" + oDataFacturaXml.numeroDocumentoReceptor + "/validarcomprobante";
            var fecha = oDataFacturaXml.fechaEmision.split("-");
            var requestData = {
                numRuc: oDataFacturaXml.rucEmisor,
                codComp: oDataFacturaXml.tipoDocumento,
                numeroSerie: oDataFacturaXml.numeroSerie.split("-")[0],
                numero: oDataFacturaXml.numeroSerie.split("-")[1],
                fechaEmision: fecha[2] + "/" + fecha[1] + "/" + fecha[0],
                monto: oDataFacturaXml.total
            };
            return new Promise((resolve, reject) => {
                jQuery.ajax({
                    url: apiUrls,
                    method: "POST",
                    data: JSON.stringify(requestData),
                    headers: {
                        "Authorization": "Bearer " + sResultToken.access_token,
                        "Content-Type": "application/json"
                    },
                    success: resolve,
                    error: reject
                });
            });
        },
        onGetTokenSunatSeguridadApi: async function () {
            var that = this;

            var appId = that._getAppModulePath();

            var apiUrls = appId + "/apisunatseguridad/v1/clientesextranet/11f24d14-dfa7-44b9-b55a-9eb0179f1b9b/oauth2/token/";
            // var apiUrls = appId + "/v1/clientesextranet/11f24d14-dfa7-44b9-b55a-9eb0179f1b9b/oauth2/token/";

            var requestData = {
                grant_type: "client_credentials",
                scope: "https://api.sunat.gob.pe/v1/contribuyente/contribuyentes",
                client_id: "11f24d14-dfa7-44b9-b55a-9eb0179f1b9b",
                client_secret: "Dw9M+IQ7zUAtpJZPvQoTJw=="
            };
            return new Promise((resolve, reject) => {
                jQuery.ajax({
                    url: apiUrls,
                    method: "POST",
                    data: requestData,
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    success: resolve,
                    error: reject
                });
            });

        },
        _getAppModulePath: function () {
            const appId = this.getOwnerComponent().getManifestEntry("/sap.app/id");
            const appPath = appId.replaceAll(".", "/");
            return jQuery.sap.getModulePath(appPath);
        },
        onIngresarCodigoFactura: function (event) {
            const value = event.getParameter("value");
            if (value) {
                nuevafacturaModel.setProperty("/isBtnPosicionesEnabled", true);
            }
        },

        onSeleccionarFecha: function (event) {
            const date = event.getSource().getDateValue();
            MODEL.setProperty("/Factura/fechaEmisionParameter", formatter.formatDateParameter(date));
        },

        onCalcularImpuestoTotal: function (event) {
            const importeBase = event.getParameter("newValue");
            const tipoImpuesto = MODEL.getProperty("/Factura/tipoImpuesto");
            let total;
            if (tipoImpuesto === "1") {
                total = importeBase * 1.18;
            }
            if (tipoImpuesto === "2") {
                total = importeBase * (1 - 0.08);
            }

            MODEL.setProperty("/Factura/total", total);
        },

        onSeleccionarTipoImpuesto: function (event) {
            const selectedKey = event.getSource().getSelectedKey();
            // const inputImporteTotal = this.getView().byId("idInputImporteTotal");
            const importeBase = MODEL.getProperty("/Factura/importe");
            let total;
            if (selectedKey === "1") {
                total = importeBase * 1.18;
            }
            if (selectedKey === "2") {
                total = importeBase * (1 - 0.08);
            }

            MODEL.setProperty("/Factura/total", total);
        },

        onCreateInvoice: async function () {
            const factura = MODEL.getProperty("/Factura");
            let dTotalConfor = obtenerTotalConformidad(factura.conformidades.results);

            if (parseFloat(factura.importe) != dTotalConfor) {
                MessageBox.error("El importe de la factura y el total de conformidades deben ser el mismo.");
                return;
            }
            factura.estadoCp = 1;
            if (factura.estadoCp != '1' && factura.estadoCp != '1') {
                MessageBox.error("El arhivo xml debe ser válido o autorizado por SUNAT");
                return;
            }
            if (!factura.codigoSolicitud) {
                MessageBox.confirm(`¿Está seguro que desea crear esta solicitud?`, {
                    onClose: function (action) {
                        if (action === "OK") this._crearFactura();
                    }.bind(this)
                });
                return;
            }
            MessageBox.confirm(`¿Está seguro que desea actualizar la solicitud ${factura.codigoSolicitud}?`, {
                onClose: function (action) {
                    if (action === "OK") this._actualizarFactura();
                }.bind(this)
            });

            function obtenerTotalConformidad(aData) {
                let dTotal = 0;
                for (let i = 0; i < aData.length; i++) {
                    dTotal = parseFloat(aData[i].NETWR) + dTotal;
                }
                return dTotal;
            }
        },

        onDeleteItemFactura: function (oEvent) {
            var impTotalDel = 0;
            const table = sap.ui.getCore().byId("container-usil.com.createinvoice---factura--OrdenesCompra");
            // if(!table) table = sap.ui.core.Fragment.byId("usil.com.createinvoice.view.fragments.CreateInvoice","OrdenesCompra");
            const selectedIndices = table.getSelectedItems().map(item => {
                let path = item.getBindingContextPath();
                return parseInt(path.substring(path.lastIndexOf("/") + 1), 16);
            });

            if (selectedIndices.length > 0) {
                var oItems = MODEL.getProperty("/DetalleFactura");
                for (var k = selectedIndices.length - 1; k >= 0; --k) {
                    oItems.splice(selectedIndices[k], 1);
                }
                MODEL.setProperty("/DetalleFactura", oItems);

                for (var j = 0; j < oItems.length; j++) {
                    impTotalDel += oItems[j].NETWR;
                }
                // sap.that.updateAmount(impTotalDel);

                table.removeSelections();
            } else {
                MessageBox.error("Debe seleccionar al menos un registro.");
            }
        },

        onCloseCreateInvoice: function (event) {
            this.closeDialog("CreateInvoice");
        },

        onBuscarOrdenes: function () {
            const busqueda = MODEL.getProperty("/FiltrosOrdenes");
            const filters = []
            if (busqueda) filters.push(new Filter("", "EQ", busqueda));
        },

        onLimpiarFiltros: function () {
            MODEL.setProperty("/FiltrosOrdenes", {});
        },

        onEliminarRegistro: function (event) {
            const contexto = event.getSource().getBindingContext();
            const orden = contexto.getObject();
            const path = contexto.getPath();
            MessageBox.confirm(`¿Está seguro de eliminar la conformidad ${orden.conformidad}?`, {
                onClose: async function (action) {
                    if (action === "OK") {
                        // const request = await this.deleteEntity(facturaModel, "/");
                        // logica temporal
                        const posiciones = MODEL.getProperty(path.slice(0, -2));
                        const ordenBorrar = MODEL.getProperty(path);
                        const index = posiciones.findIndex(item => item.conformidad === ordenBorrar.conformidad);
                        posiciones.splice(index, 1);
                        MODEL.setProperty(path.slice(0, -2), posiciones);
                    }
                }.bind(this)
            });
        },

        /**
         * Manejador de evento cargar un archivo adjunto
         * @param {sap.ui.base.Event} event 
         */
        onCargaAdjuntos: async function (event) {
            const adjuntos = MODEL.getProperty("/Adjuntos") || [];
            const files = event.getParameter("files");
            const control = event.getSource();
            const readable = await control.checkFileReadable();

            if (files.length > 0) {
                const file = files[0];
                adjuntos.push(file);
                MODEL.setProperty("/Adjuntos", adjuntos);
            }
            control.setValue("");
        },

        onEliminarAdjunto: function (event) {
            const path = event.getSource().getBindingContext().getPath();
            const index = path.slice(-1);
            const adjuntos = MODEL.getProperty("/Adjuntos");
            adjuntos.splice(index, 1);
            MODEL.setProperty("/Adjuntos", adjuntos);
        },

        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */

        /**
         * Binds the view to the object path.
         * @function
         * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
         * @private
         */
        _onFacturaMatched: async function (oEvent) {
            const historyDirection = History.getInstance().getDirection();
            if (historyDirection === "Backwards") {
                return;
            }
            let param = oEvent.getParameter("arguments").codigoSolicitud;
            let viewTitle = this.getResourceBundle().getText("facturaViewTitleCreate");
            let factura = {};
            if (param === "N") {
                this._limpiarData();
            }
            if (param !== "N") {
                factura = await this._getSolicitud(param);
                viewTitle = this.getResourceBundle().getText("facturaViewTitleEdition", [param]);
                nuevafacturaModel.setProperty("/isBtnPosicionesEnabled", true);
                MODEL.setProperty("/Factura", factura);
            }

            nuevafacturaModel.setProperty("/facturaViewTitle", viewTitle);
            this._bindView("/Factura");
        },

        /**
         * Binds the view to the object path.
         * @function
         * @param {string} sObjectPath path to the object to be bound
         * @private
         */
        _bindView: function (sObjectPath) {

            this.getView().bindElement({
                path: sObjectPath,
                events: {
                    change: this._onBindingChange.bind(this),
                    dataRequested: function () {
                        facturaModel.setProperty("/busy", true);
                    },
                    dataReceived: function () {
                        facturaModel.setProperty("/busy", false);
                    }
                }
            });
        },

        _onBindingChange: function () {
            var oView = this.getView(),
                oElementBinding = oView.getElementBinding();

            // No data for the binding
            if (!oElementBinding.getBoundContext()) {
                this.getRouter().getTargets().display("objectNotFound");
                return;
            }
            nuevafacturaModel.setProperty("/busy", false);
            nuevafacturaModel.setProperty("/isEnabledCabecera", true);

            MODEL.setProperty("/FiltrosOrdenes", {});
            const fileUploader = this.getView().byId("fileUploader");
            fileUploader.setValue("");
        },

        _limpiarData: function () {
            MODEL.setProperty("/Factura", {
                conformidades: {
                    results: []
                },
                tipoImpuesto: "1"
            });
            nuevafacturaModel.setProperty("/isBtnPosicionesEnabled", false);
            MODEL.setProperty("/Adjuntos", []);
        },

        _readFiles: async function (file) {
            const resolveImport = (evt) => {
                const objData = this._xmlToJson(evt.target.result);
                // const workbook = XLSX.read(evt.target.result,{
                //     type: "binary"
                // });
                // const data = workbook.Sheets[workbook.SheetNames[0]];
                // const objData = XLSX.utils.sheet_to_json(data);
                return objData;
            };

            const rejectImport = (error) => error;

            const dataFile = new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = resolve;
                reader.onerror = reject;
                reader.readAsBinaryString(file);
            });

            return await dataFile.then(resolveImport, rejectImport);
        },

        _crearFactura: async function () {
            const data = this._getDataFactura();
            //const request = await this.createEntity(facturaModel, "/Facturas", data);
            const request = await this.createEntity(ODATA_SAP, "/facturaSet", data);
            const type = "success";
            //MessageBox.success(`La solicitud ${request.codigoSolicitud}  se ha sido creada correctamente`, {
            if (request.e_msg.indexOf("exito") < 0) {
                type = "error";
            }
            MessageBox[type](request.e_msg, {
                onClose: function () {
                    ODATA_SAP.refresh();
                    this.onNavSolicitudes();
                }.bind(this)
            });
            // this.closeDialog("CreateInvoice");
        },

        _actualizarFactura: async function () {
            const data = this._getDataFactura();
            const request = await this.updateEntity(facturaModel, `/Facturas('${data.codigoSolicitud}')`, data);
            MessageBox.success(`La solicitud ${request.codigoSolicitud}  se ha sido actualizada correctamente`, {
                onClose: function () {
                    facturaModel.refresh();
                    this.onNavSolicitudes();
                }.bind(this)
            });
            // this.closeDialog("CreateInvoice");
        },

        _getDataFactura: function () {
            const factura = MODEL.getProperty("/Factura");
            const conformidades = factura.conformidades.results.map(item => {
                // return {
                //     "conformidad": item.conformidad,
                //     "posicionConformidad": item.posicionConformidad,
                //     "ordenCompra": item.ordenCompra,
                //     "posicionOrden": item.posicionOrden,
                //     "codigoMaterial": item.codigoMaterial,
                //     "descripcionMaterial": item.descripcionMaterial,
                //     "cantidad": parseFloat(item.cantidad),
                //     "importe": item.importe,
                //     "moneda": item.moneda
                // };
                return {
                    "mandt": "800",
                    "bukrs": factura.sociedad,
                    "lifnr": "500000",
                    "codefact": "",
                    "posnr": item.BUZEI,
                    "datre": "20001102",
                    "ebeln": item.EBELN,
                    "lblni": "",
                    "ebelp": item.EBELP,
                    "matnr": item.MATNR,
                    "tipod": "B",
                    "menge": item.MENGE,
                    "meins": item.MEINS,
                    "netwr": item.NETWR,
                    "waers": item.WAERS,
                    "txz01": item.TXZ01,
                    "belnr": item.BELNR
                }
            });
            let dIgv = 0,
                dRetencion = 0;

            if (factura.tipoImpuesto == 1) {
                dIgv = parseFloat(factura.total) / parseFloat(factura.importe);
            } else {
                dRetencion = parseFloat(factura.total) / parseFloat(factura.importe);
            }

            const data = {
                // "codigoFactura": factura.codigoFactura || "",
                // "fechaEmision": factura.fechaEmisionParameter,
                // "fechaRegistro": formatter.formatDateParameter(new Date()),
                // "importe": factura.importe,
                // "total": factura.total,
                // "sociedad": factura.sociedad,
                // "estadoFactura_ID": 1,
                // "estadoContabilizacion": { "ID": 0 },
                // "moneda": "PEN",
                // "igv": 34.23,
                "mandt": "800",
                "bukrs": factura.sociedad,
                "lifnr": "",
                "datre": "20231025",
                "codefact": "",
                "datfa": "20231026",
                "xblnr": factura.codigoFactura,
                "fatyp": "F",
                "cpudt": "00000000",
                "fhdet": "00000000",
                "detra": "0",
                "reten": "0",
                "wrbtr": "0",
                "netwr": parseFloat(factura.importe),//factura.total.toString(),
                "bankn": "",
                "bankl": "",
                "banks": "",
                "bestu": "CR",
                "waers": "PEN",
                "mnsje": "",
                "igv": dIgv
                //conformidades: conformidades
            }
            const codigoSolicitud = factura.codigoSolicitud;
            if (codigoSolicitud) data.codigoSolicitud = codigoSolicitud;

            let oReturn = {
                "i_userscp": "P2002198484",
                "i_accion": "CR",
                "is_fact_prov_c": JSON.stringify(data),
                "it_fact_prov_d": JSON.stringify(conformidades)
            };

            return oReturn;
        },

        _getSolicitud: async function (codigoSolicitud) {
            const parameters = {
                filters: [],
                urlParameters: {
                    "$expand": "estadoFactura,conformidades"
                }
            }

            return await this.readEntity(facturaModel, `/Facturas('${codigoSolicitud}')`, parameters);

        },

        _xmlToJson: function (xml) {
            const roots = $(xml);
            const root = roots[roots.length - 1];
            const json = {};
            this._parse(root, json);
            console.log(json);
            return json;
        },

        _parse: function (node, j) {
            var nodeName = node.nodeName.replace(/^.+:/, '').toLowerCase();
            var cur = null;
            var that = this;
            var text = $(node).contents().filter(function (x) {
                return this.nodeType === 3;
            });
            if (text[0] && text[0].nodeValue.trim()) {
                cur = text[0].nodeValue;
            } else {
                cur = {};
                $.each(node.attributes, function () {
                    if (this.name.indexOf('xmlns:') !== 0) {
                        cur[this.name.replace(/^.+:/, '')] = this.value;
                    }
                });
                $.each(node.children, function () {
                    that._parse(this, cur);
                });
            }

            j[nodeName] = cur;
        },

        onRefresh: function () {
            var oTable = this.byId("idtablaFactura");
            oTable.getBinding("items").refresh();
        },

        onBusquedaRapida: function (event) {
            if (event.getParameters().refreshButtonPressed) {
                this.onRefresh();
            } else {
                var aTableSearchState = [];
                var query = event.getParameter("newValue");

                if (query && query.length > 0) {
                    aTableSearchState = [
                        new Filter({
                            filters: [
                                new Filter("BELNR", FilterOperator.Contains, query),
                                new Filter("EBELN", FilterOperator.Contains, query),
                                new Filter("TXZ01", FilterOperator.Contains, query)
                            ],
                            and: false
                        })
                    ];
                }
                this._applySearch(aTableSearchState);
            }
        },

        _applySearch: function (aTableSearchState) {
            var oTable = this.byId("idtablaFactura");
            oTable.getBinding("items").filter(aTableSearchState, "Application");
            // changes the noDataText of the list in case there are no filter results
            //if (aTableSearchState.length !== 0) {
            //    viewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("solicitudesNoDataWithSearchText"));
            //}
        }



        //   xmlToJson('<?xml version="1.0" encoding="UTF-8"?><atom:entry xmlns:atom="http://www.w3.org/2005/Atom" xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata"> <atom:content type="application/xml"> <m:properties> <d:Pernr>800001</d:Pernr> <d:Approve>X</d:Approve> </m:properties> </atom:content> <atom:link rel="http://schemas.microsoft.com/ado/2007/08/dataservices/related/ToLeaveItem" type="application/atom+xml;type=feed" title="ZHR_APP_SRV.Header_Item"> <m:inline> <atom:feed> <atom:entry> <atom:content type="application/xml"> <m:properties> <d:Pernr></d:Pernr> <d:Index>0</d:Index> <d:RequestId>74867AF30B3A1ED4BDA9EDC88782C0EC</d:RequestId> </m:properties> </atom:content> </atom:entry> </atom:feed> </m:inline> </atom:link> </atom:entry>');


    });

});
