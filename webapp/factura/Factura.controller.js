sap.ui.define([
    "../controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "sap/m/MessageBox",
    "../model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/format/DateFormat",
    'sap/m/Token',
], function (
    BaseController,
    JSONModel,
    History,
    MessageBox,
    formatter,
    Filter,
    FilterOperator,
    DateFormat,
    Token
) {
    "use strict";
    let MODEL,
        nuevafacturaModel,
        facturaModel,
        ODataUtilidadesModel,
        that,
        ODATA_SAP;
    return BaseController.extend("usil.com.createinvoice.atc.factura.Factura", {

        formatter: formatter,

        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

        /**
         * Called when the worklist controller is instantiated.
         * @public
         */
        onInit: function () {
            that = this;
            nuevafacturaModel = new JSONModel({
                busy: true,
                delay: 0,
                isEnabledCabecera: true,
                isBtnPosicionesEnabled: false                
                // facturaViewTitle: this.getResourceBundle().getText("facturaViewTitleCreate")
            });
            sap.ui.getCore().setModel(new JSONModel({ "TotalNETPR": 0 }), "TotalNETPR");
            that.getView().byId("AdjuntosFactura").setModel(new JSONModel({ "Adjuntos": [] }));
            this.getRouter().getRoute("factura").attachPatternMatched(this._onFacturaMatched, this);
            this.setModel(nuevafacturaModel, "facturaView");
            MODEL = this.getOwnerComponent().getModel();
            let oMultiInputNumfaBl = that.byId("InputNumfactBl");
            let fnValidator = function (args) {
                let text = args.text;

                return new Token({ key: text, text: text });
            };
            oMultiInputNumfaBl.addValidator(fnValidator);

            facturaModel = this.getOwnerComponent().getModel("facturaModel");
            ODATA_SAP = this.getOwnerComponent().getModel("ODATA_SAP");
            ODataUtilidadesModel = this.getOwnerComponent().getModel("ODataUtilidadesModel");
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
            try {
                sap.ui.core.BusyIndicator.show();
                this.getRouter().navTo("solicitudes", {}, true);
            } catch (error) {
                sap.ui.core.BusyIndicator.hide();
                const errorType = "error";
                MessageBox[errorType]("Se produjo un error al tratar de navegar al reporte de solicitudes : " + error.message);
            }

        },

        onNavOrdenes: function () {
            try {
                sap.ui.core.BusyIndicator.show();
                this.getRouter().navTo("orden", {}, false);
            } catch (error) {

            }

        },

        onNavSolicitudes: function () {
            sap.ui.core.BusyIndicator.show();
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

                if (!dataXml.attacheddocument.attachment.externalreference.description.invoice && !dataXml.invoice) {//dataXml.invoice
                    MessageBox.error(`El archivo xml no cumple con el formato requerido`);
                    fileUploader.setValue("");                    
                    return;
                }
                const invoice = (dataXml.attacheddocument) ? ((dataXml.attacheddocument.attachment.externalreference.description.invoice) ? dataXml.attacheddocument.attachment.externalreference.description.invoice : dataXml.attacheddocument.attachment.externalreference.description) : dataXml.invoice//dataXml.invoice;

                let version = invoice.ublversionid;
                version = parseFloat(version);
                if (version <= 2.0) {
                    MessageBox.error(`La version ${version} no es compatible, se requiere 2.0 o superior`);
                    fileUploader.setValue("");
                    return;
                }
                  
                const datosFactura = {
                    //version: invoice.ublversionid,
                    numeroSerie: invoice.id,
                    fechaEmision: invoice.issuedate,
                    //fechaVencimiento: invoice.paymentterms.paymentduedate,
                    //tipoDocumento: invoice.invoicetypecode,
                    tipoMoneda: (invoice.documentcurrencycode) ? invoice.documentcurrencycode : invoice.note.documentcurrencycode,
                    //rucEmisor: invoice.accountingsupplierparty.party.partyidentification.id,
                    //nombreComercialEmisor: invoice.accountingsupplierparty.party.partyidentification.id,
                    //numeroDocumentoReceptor: invoice.accountingcustomerparty.party.partyidentification.id,
                    //tipoDocumentoReceptor: "",
                    //nombresReceptor: invoice.accountingcustomerparty.party.partylegalentity.registrationname,
                    //unidadMedida: "",
                    //cantidad: invoice.invoiceline.invoicedquantity,
                    //codigoProducto: invoice.invoiceline.item.sellersitemidentification.id,
                    //codigoProductoSunat: "",
                    //descripcionItem: invoice.invoiceline.item.description,
                    //precioUnitario: invoice.invoiceline.price.priceamount,
                    //igvItem: invoice.invoiceline.taxtotal.taxamount,
                    //valorVentaItem: invoice.invoiceline.pricingreference.alternativeconditionprice.priceamount,
                    //descuentoItem: false,
                    //totalValorVenta: "",
                    //totalDescuentos: "",
                    //sumatoriaIgv: invoice.taxtotal.taxamount,
                    ordenReference: (invoice.orderreference) ? invoice.orderreference.id :(typeof invoice.note === 'object' )?invoice.note.orderreference.id:"",
                    nitproovedor: (invoice.accountingsupplierparty) ? invoice.accountingsupplierparty.party.partytaxscheme.companyid : "",
                    importe: (invoice.legalmonetarytotal) ? invoice.legalmonetarytotal.lineextensionamount : invoice.note.legalmonetarytotal.lineextensionamount,//(invoice.taxtotal)?invoice.taxtotal.taxsubtotal.taxableamount:invoice.note.taxtotal.taxsubtotal.taxableamount, ///
                    total: (invoice.legalmonetarytotal) ? invoice.legalmonetarytotal.payableamount : invoice.note.legalmonetarytotal.payableamount,
                    //sociedad: "3000"
                };
                
                MODEL.setProperty("/facturaXml", datosFactura);

                const fechaEmisionView = formatter.formatDateImportacion(datosFactura.fechaEmision);
                const fechaEmisionParamenter = formatter.formatDateParameter(fechaEmisionView);
                MODEL.setProperty("/Factura/codigoFactura", datosFactura.numeroSerie);
                MODEL.setProperty("/Factura/fechaEmision", fechaEmisionView);
                MODEL.setProperty("/Factura/fechaEmisionParameter", fechaEmisionParamenter);
                MODEL.setProperty("/Factura/importe", datosFactura.importe);
                MODEL.setProperty("/Factura/total", datosFactura.total);                             
                await this.getwaershelp(datosFactura.tipoMoneda);
                let waersCollection = that.getView().getModel("waershelp").getData();
                var find = waersCollection.find(item => item.VALUE == datosFactura.tipoMoneda);
                var moneda = (find) ? (find.VALUE + " - " + find.TEXTO) : datosFactura.tipoMoneda;
                MODEL.setProperty("/Factura/moneda", moneda);
                //MODEL.setProperty("/Factura/sociedad", datosFactura.sociedad);

                nuevafacturaModel.setProperty("/isEnabledCabecera", true);
                MODEL.setProperty("/Factura/estado", "No validado");
                MODEL.setProperty("/Factura/estadoState", "Information");
                MODEL.setProperty("/Factura/estadoIcon", "sap-icon://information");
                MODEL.setProperty("/Factura/estadoCp", "");

                var validCaracter = datosFactura.ordenReference.substring(0, 2) === "45";
                if(validCaracter){
                    MODEL.setProperty("/Factura/pedido", datosFactura.ordenReference); 
                    that.onBuscarOC(datosFactura.ordenReference,datosFactura.importe);  
                }
                else{
                var SplitOrdenReference = datosFactura.ordenReference.split(";");                
                let oMultiInputNumfaBl = that.byId("InputNumfactBl");
                $.each(SplitOrdenReference,function(i,item){
                    oMultiInputNumfaBl.addToken(new Token({ key: item, text: item }))  
                });                             
                MODEL.setProperty("/Factura/Numfa", datosFactura.ordenReference); 
                
                } 
                // this._destroyMessageStrip();
            }
        },
        onClearArchivoXml: function (event) {
            let oMultiInputNumfaBl = that.byId("InputNumfactBl");
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
            MODEL.setProperty("/Factura/moneda", "");
            MODEL.setProperty("/Factura/Numfa", "");
            MODEL.setProperty("/Factura/pedido","")
            oMultiInputNumfaBl.setTokens([])
            nuevafacturaModel.setProperty("/isEnabledCabecera", true);
            nuevafacturaModel.setProperty("/isBtnPosicionesEnabled", false);
            const fileUploader = this.getView().byId("fileUploader");
            fileUploader.setValue("");
            that.getView().byId("sumatoriaImporte").setText("");
            that._limpiarData();
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
            let total;
            total = (importeBase * 1.19).toFixed(2);
            MODEL.setProperty("/Factura/total", total);
            that.onCalcularDiferencia(importeBase);
        },
        onCalcularDiferencia: function (importeBase) {
            let TotalNETPR = sap.ui.getCore().getModel("TotalNETPR").getData().TotalNETPR;            
            let diferencia = (importeBase - that.convertirFormato(TotalNETPR)).toFixed(2);
            MODEL.setProperty("/Factura/diferencia", diferencia);
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
            /*
            if (parseFloat(factura.importe) != dTotalConfor) {
                MessageBox.error("El importe de la factura y el total de conformidades deben ser el mismo.");
                return;
            }
            factura.estadoCp = 1;
            if (factura.estadoCp != '1' && factura.estadoCp != '1') {
                MessageBox.error("El arhivo xml debe ser válido o autorizado por SUNAT");
                return;
            }*/
            //if (!factura.codigoSolicitud) {
            let valid = that.onValidarCampos();
            if (!valid) {
                MessageBox.warning("Completar todos los campos obligatorios");
                sap.ui.core.BusyIndicator.hide()
                return;
            }
            sap.ui.core.BusyIndicator.show()
            let validDiferencia = await that.validarDiferencia();
            if (!validDiferencia) {
                let diferencia = MODEL.getProperty("/Factura/diferencia");
                let tolerancia = await that.ongetTolerancia();
                MessageBox.warning("La diferencia entre el importe y el total de las posiciones excedió la tolerancia configurada." + "\n"+"\n"+"Diferencia: "+ parseFloat(diferencia).toFixed(2) + "."+"\n"+"\n" + "Tolerancia actual: " + parseFloat(tolerancia).toFixed(2) + ".");
                sap.ui.core.BusyIndicator.hide()
                return;
            }
            sap.ui.core.BusyIndicator.hide()
            MessageBox.confirm(`¿Está seguro que desea crear la solicitud de factura?`, {
                onClose: function (action) {
                    if (action === "OK") {
                        this._crearFactura();
                    }
                }.bind(this)
            });
            //return;
            //}
            /* MessageBox.confirm(`¿Está seguro que desea actualizar la solicitud ${factura.codigoSolicitud}?`, {
                 onClose: function (action) {
                     if (action === "OK") this._actualizarFactura();
                 }.bind(this)
             });*/

            function obtenerTotalConformidad(aData) {
                let dTotal = 0;
                for (let i = 0; i < aData.length; i++) {
                    dTotal = parseFloat(aData[i].NETPR) + dTotal;
                }
                return dTotal;
            }
        },

        onDeleteItemFactura: function (oEvent) {
            var impTotalDel = 0;
            const table = sap.ui.getCore().byId("container-usil.com.createinvoice.atc---factura--OrdenesCompra");
            // if(!table) table = sap.ui.core.Fragment.byId("usil.com.createinvoice.atc.view.fragments.CreateInvoice","OrdenesCompra");
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
                    impTotalDel += oItems[j].NETPR;
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
                        let importeBase = MODEL.getProperty("/Factura/importe");
                        that.onCalcularSumaPosiciones();
                        that.onCalcularDiferencia((importeBase == undefined) ? 0.00 : importeBase);
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
            const fileUploader = that.getView().byId("AdjuntosUploader");
            if (files.length > 0) {
                const file = files[0];
                let exist = that.onAttachmentExist(file);
                if (exist) {
                    sap.m.MessageToast.show("El archivo ya se encuentra cargado.");
                    fileUploader.setValue("");
                    return;
                }
                const base64String = await that.readFileAsBase64(file);
                adjuntos.push({
                    "lastModifiedDate": new Date(),
                    "name": file.name.split(".")[0],
                    "type": "." + file.name.split(".").pop(),
                    "mimeType": file.type,
                    "base64": base64String
                });
                that.getView().byId("AdjuntosFactura").setModel(new JSONModel({ "Adjuntos": adjuntos }));
                fileUploader.setValue("");
            }
        },
        onAttachmentExist: function (file) {
            let exist = false;
            let adjuntos = that.getView().byId("AdjuntosFactura").getModel().getData().Adjuntos;
            $.each(adjuntos, function (i, item) {
                if (item.name == file.name.split(".")[0] && item.type == ("." + file.name.split(".").pop())) {
                    exist = true;
                }
            });
            return exist;
        },
        readFileAsBase64: function (file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();

                reader.onload = () => {
                    resolve(reader.result.split(',')[1]);
                };

                reader.onerror = (error) => {
                    reject(error);
                };

                reader.readAsDataURL(file);
            });
        },
        downloadFromBase64: function (event) {
            let fila = event.getSource().getBindingContext().getProperty();
            var byteCharacters = atob(fila.base64);
            var byteNumbers = new Array(byteCharacters.length);
            for (var i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            var byteArray = new Uint8Array(byteNumbers);
            var blob = new Blob([byteArray], { type: fila.mimeType });

            // Crear un enlace de descarga
            var link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = fila.name + fila.type;
            // Simular un clic en el enlace para iniciar la descarga
            link.click();
        },
        onEliminarAdjunto: function (oEvent) {
            var oButton = oEvent.getSource();
            var oListItem = oButton.getParent();
            var iIndex = oListItem.getBindingContextPath().split("/").pop();
            var oTable = that.getView().byId("AdjuntosFactura");
            var oModel = oTable.getModel();
            var aItems = oModel.getProperty("/Adjuntos");
            sap.m.MessageBox.confirm("¿Estás seguro de que deseas eliminar este archivo?", {
                title: "Confirmar eliminación",
                onClose: function (oAction) {
                    if (oAction === sap.m.MessageBox.Action.OK) {
                        aItems.splice(iIndex, 1);
                        oModel.setProperty("/Adjuntos", aItems);
                    }
                }
            });
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
            let lifnr = sap.ui.getCore().getModel("Lifnr");
            if (lifnr == undefined) {
                that.onNavBack();
                return;
            }
            
            //that._limpiarData();
            sap.ui.core.BusyIndicator.hide();
            let TotalNETPR = sap.ui.getCore().getModel("TotalNETPR").getData().TotalNETPR;
            that.getView().byId("sumatoriaImporte").setText(formatter.formatCurrency(TotalNETPR));
            let importeBase = MODEL.getProperty("/Factura/importe");
            that.onCalcularDiferencia((importeBase == undefined) ? 0.00 : importeBase);
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
            /*if (param !== "N") {
                factura = await this._getSolicitud(param);
                viewTitle = this.getResourceBundle().getText("facturaViewTitleEdition", [param]);
                nuevafacturaModel.setProperty("/isBtnPosicionesEnabled", true);
                MODEL.setProperty("/Factura", factura);
            }*/

            nuevafacturaModel.setProperty("/facturaViewTitle", viewTitle);
            
            this._bindView("/Factura");
        },
        onCalcularSumaPosiciones: function () {
            let suma = 0;
            let posiciones = MODEL.getProperty("/Factura/conformidades/results");
            $.each(posiciones, function (i, item) {
                suma = suma + parseFloat(item.NETPR);
            });
            sap.ui.getCore().setModel(new JSONModel({ "TotalNETPR": suma }), "TotalNETPR");
            that.getView().byId("sumatoriaImporte").setText(formatter.formatCurrency(suma));
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
                condpedido:{
                    results: [] 
                },
                tipoImpuesto: "1",
                visibleconpedido:false,
                visiblepos:true
            });            
            
            that.getView().byId("InputFactura").setValue("");
            that.getView().byId("FechaEmision").setValue("");
            that.getView().byId("InputImporte").setValue("");
            that.getView().byId("InputSelectWaers").setValue("");
            nuevafacturaModel.setProperty("/isBtnPosicionesEnabled", false);
            MODEL.setProperty("/Adjuntos", []);
            that.getView().byId("AdjuntosFactura").setModel(new JSONModel({ "Adjuntos": [] }));
        },
        ongetTolerancia: async function(){
            const parameters = {
                filters: [],
                urlParameters: {
                   
                }
            }
            var response = await this.readEntity(ODATA_SAP, `/getToleranciaSet`, parameters);
            return response.results[0].E_TOLER;            
        },
        _readFiles: async function (file) {
            const resolveImport = (evt) => {
                //const objData = this._xmlToJson(evt.target.result);
                const content = evt.target.result;
                const withoutBom = this._removeBom(content);
                const objData = this._xmlToJson(withoutBom);
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
        _removeBom: function (content) {
            return content.replace(/^\ï»¿/, ''); //Remove Bom
        },

        _mostrarMensaje: function (Mensaje) {
            var oMessageStrip = new sap.m.MessageStrip({
                text: Mensaje,
                type: sap.ui.core.MessageType.Success,
                showIcon: true,
                customIcon: "sap-icon://error",
                class: "sapUiMsgError"
            });
            var oDialog = new sap.m.Dialog({
                title: "Dato Obligatorio",
                content: [oMessageStrip],
                beginButton: new sap.m.Button({
                    text: "Cerrar",
                    press: function () {
                        oDialog.close();
                    }
                })
            });
            oDialog.open();
        },
        validarDiferencia: async  function () {
            let diferencia = MODEL.getProperty("/Factura/diferencia");
            var tolerancia = await that.ongetTolerancia();
            let valid = (parseFloat(diferencia) <= parseFloat(tolerancia)) ? true : false;
            return valid;
        },
        _crearFactura: async function () {
            try {
                sap.ui.core.BusyIndicator.show();
                const data = this._getDataFactura();

                const request = await this.createEntity(ODATA_SAP, "/crearSolFactSet", data);
                const type = "success";
                sap.ui.core.BusyIndicator.hide();
                MessageBox[type](request.E_MSG, {
                    onClose: function () {
                        ODATA_SAP.refresh();
                        sap.ui.core.BusyIndicator.hide();
                        this.onNavSolicitudes();
                    }.bind(this)
                });
            } catch (error) {
                console.error("Error al crear factura:", error);
                sap.ui.core.BusyIndicator.hide();
                const type = "error";
                MessageBox[type]("Ocurrió un error al crear la solicitud de la factura. Por favor, inténtelo nuevamente.");
            }
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
        onValidarCampos: function () {
            let valid = true;
            const factura = MODEL.getProperty("/Factura");
            if (factura.codigoFactura == undefined || factura.codigoFactura == "") {
                that.getView().byId("InputFactura").setValueState("Error")
                valid = false;
            }
            else {
                that.getView().byId("InputFactura").setValueState("None")
            }

            if (factura.fechaEmisionParameter == undefined || factura.fechaEmisionParameter == "") {
                that.getView().byId("FechaEmision").setValueState("Error")
                valid = false;
            }
            else {
                that.getView().byId("FechaEmision").setValueState("None")
            }
            if (factura.importe == undefined || factura.importe == "") {
                that.getView().byId("InputImporte").setValueState("Error")
                valid = false;
            }
            else {
                that.getView().byId("InputImporte").setValueState("None")
            }
            if (factura.moneda == undefined || factura.moneda == "") {
                that.getView().byId("InputSelectWaers").setValueState("Error")
                valid = false;
            }
            else {
                that.getView().byId("InputSelectWaers").setValueState("None")
            }
            /*    if (factura.pedido == undefined || factura.pedido == "") {
                    that.getView().byId("pedido").setValueState("Error")
                    valid = false;
                }
                else {
                    that.getView().byId("pedido").setValueState("None")
                }
                */
            return valid;
        },
        _getDataFactura: function () {
            const factura = MODEL.getProperty("/Factura");
            let posnr = 0;
            let adjuntos = MODEL.getProperty("/Adjuntos");
            const adjuntoModel = adjuntos.map(item => {
                posnr = posnr + 10
                return {
                    "POSNR": posnr,
                    "DATUM": that.convertirFechaAFormatoYMD(item.lastModifiedDate),
                    "BASE64": item.base64,
                    "FILETYPE": item.type,
                    "FILENAME": item.name,
                    "BUKRS": "1000"
                }
            });

            const conformidades = factura.conformidades.results.map(item => {
                return {
                    "mandt": "800",
                    "bukrs": item.BUKRS,
                    "lifnr": item.LIFNR,
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
                    //"NETPR": item.NETPR,
                    "netpr": item.NETPR,
                    "waers": item.WAERS,
                    "txz01": item.TXZ01,
                    "belnr": item.BELNR,
                    "mwskz": item.MWSKZ
                }
            });

            const conpedido = factura.condpedido.results.map(item => {
                return {                   
                    "ebeln": item.EBELN,
                    "kbetr": item.KBETR,
                    "knumv": item.KNUMV,
                    "kposn": item.KPOSN,
                    "kschl": item.KSCHL,
                    "waers": item.WAERS                  
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
                "NETPR": parseFloat(factura.importe),//factura.total.toString(),
                "bankn": "",
                "bankl": "",
                "banks": "",
                "bestu": "CR",
                "waers": "PEN",
                "mnsje": "",
                "igv": dIgv
            }
            const codigoSolicitud = factura.codigoSolicitud;
            if (codigoSolicitud) data.codigoSolicitud = codigoSolicitud;
            let facturxml = (MODEL.getProperty("/facturaXml") == undefined || MODEL.getProperty("/facturaXml") == "" || MODEL.getProperty("/facturaXml") == null) ? "" : MODEL.getProperty("/facturaXml");

            let oReturn = {
                "STCD1": (facturxml != "") ? facturxml.nitproovedor : "",
                "NUMFA": factura.Numfa, //(facturxml!="")?facturxml.ordenReference:"",
                "EBELN": factura.pedido,
                "TIPDAT": "NACION",
                "ESTADO": "01",
                "WAERS": factura.moneda.split("-")[0].trim(),
                "LIFNR": sap.ui.getCore().getModel("Lifnr").getData().Lifnr,
                "FACTUR": factura.codigoFactura,
                "FEMISI": that.formatFecha(factura.fechaEmisionParameter),
                "IMPORT": that.convertirFormato(factura.importe),
                "SOLFAC": "",
                "FCRESO": ""
            }
            let obj = {
                "IS_CAB": JSON.stringify(oReturn),
                "IT_DET": JSON.stringify(conformidades),
                "IT_DOC": JSON.stringify(adjuntoModel),
                "IT_COND": JSON.stringify(conpedido)
            };
            return obj;
        },

        convertirFechaAFormatoYMD(fecha) {
            // Asegurarse de que la entrada sea un objeto Date
            if (!(fecha instanceof Date)) {
                throw new Error('La entrada debe ser un objeto Date.');
            }

            // Obtener los componentes de la fecha
            const year = fecha.getFullYear();
            const month = String(fecha.getMonth() + 1).padStart(2, '0'); // Los meses son 0-indexados
            const day = String(fecha.getDate()).padStart(2, '0');

            // Construir la cadena en el formato yyyyMMdd
            const formatoYMD = `${year}${month}${day}`;

            return formatoYMD;
        },



        formatFecha: function (fecha) {
            // Extraer la fecha del formato "2023-11-16T05:00:00"            
            var fechaArray = fecha.split("T");
            var fechaExtraida = fechaArray[0];

            // Reemplazar los guiones
            var fechaFormateada = fechaExtraida.replace(/-/g, '');

            return fechaFormateada;
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
                //el nodo description contiene CDATA con tag Invoice que tiene la info de factura
                //se ajustó la lógica para extraer el valor correctamente
                if (nodeName.includes("description")) {
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
                else {
                    cur = text[0].nodeValue;
                }

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
        },
        onFileSizeExceed: function (oEvent) {
            sap.m.MessageToast.show("El adjunto no debe pesar más de 10 MB.");
        },
        onSuggestWaers: async function (event) {
            var sValue = event.getSource().getValue(),//event.getParameter("suggestValue"),
                aFilters = [];
            sValue = sValue.toUpperCase();
            await this.getwaershelp(sValue);
            if (sValue) {
                aFilters = [
                    new Filter([
                        new Filter("VALUE", function (sText) {
                            return (sText || "").toUpperCase().indexOf(sValue.toUpperCase()) > -1;
                        }),
                        new Filter("TEXTO", function (sDes) {
                            return (sDes || "").toUpperCase().indexOf(sValue.toUpperCase()) > -1;
                        })
                    ], false)
                ];
            }
            if (this.byId("InputSelectWaers").getBinding("suggestionItems") != undefined) {
                this.byId("InputSelectWaers").getBinding("suggestionItems").filter(aFilters);
                //this.byId("InputSelectWaers").suggest();
            }
        },
        getwaershelp: function (sValue = "") {
            let value = sValue.substr(0, 18);
            return new Promise((resolve, reject) => {
                ODataUtilidadesModel.read("/filtrosSet", {
                    filters: [
                        new Filter("i_value", FilterOperator.EQ, value),
                        new Filter("i_object", FilterOperator.EQ, "WAERS")
                    ],
                    success: function (oData) {
                        if (oData.results.length) {
                            let aWaers = JSON.parse(oData.results[0].et_data);
                            that.getView().setModel(new JSONModel(aWaers), "waershelp");
                        }
                        resolve(true);
                    },
                    error: function (oError) {
                        MessageBox.error(oError.responseText);
                        resolve(true);
                    }
                });
            });
        },
        onBuscarOC: async function (pedido,ImporteBase) {
            sap.ui.core.BusyIndicator.show();
         
            const filters = [];
            let lifnr = sap.ui.getCore().getModel("Lifnr").getData().Lifnr;            
            filters.push(new Filter("IR_BUKRS", "EQ", "1000"));
            filters.push(new Filter("IR_LIFNR", "EQ", /*"0000000034"*/lifnr));
            //filters.push(new Filter("I_LOEKZ", "EQ", "X"));
            filters.push(new Filter("I_ELIKZ", "EQ", "X"));
           
            filters.push(new Filter("IR_EBELN", "EQ", pedido));    

            let parameters = { filters: filters };
            const request = await this.readEntity(ODATA_SAP, "/getOrdenCompraSet", parameters);
            var posiciones = [];
            if(request.results.length>0){
                posiciones = JSON.parse(request.results[0].ET_DATA);
                $.each(posiciones, function (i, item) {
                    item.NETPR = (item.NETPR).toString();
                    item.MENGE = (item.MENGE).toString();
                });
            }
            else{
                MessageBox.information(
                    "No existen pedidos confirmados para el proveedor seleccionado.",
                    {
                        title: "No se encontraron resultados",
                        actions: [MessageBox.Action.CLOSE],
                        //details: htmlmessage
                    }
                );
            }  
            posiciones.sort((a, b) => a.BELNR - b.BELNR);
            let sumatoria = 0;
            posiciones.map(element => {                
                sumatoria = sumatoria + (parseFloat(that.convertirFormato(element.NETPR)) * parseFloat(that.convertirFormato(element.MENGE)) );                
            });
            MODEL.setProperty("/Factura/conformidades/results", posiciones);
            sap.ui.getCore().setModel(new JSONModel({ "TotalNETPR": sumatoria }), "TotalNETPR")
            //that.getView().byId("tableHeader").setText("Posiciones (" + posiciones.length +")");
            that.onCalcularSumaPosiciones();
            that.onCalcularDiferencia(ImporteBase);
            sap.ui.core.BusyIndicator.hide();
        },
        convertirFormato(valor) {
            // Reemplazar las comas con una cadena vacía
            const valorSinComas = valor.toString().replace(/,/g, '');

            // Convertir la cadena a un número
            const numero = parseFloat(valorSinComas);

            // Verificar si el valor es un número válido
            if (!isNaN(numero)) {
                // Formatear el número de nuevo a una cadena con dos decimales
                const valorFormateado = numero.toFixed(2);
                return valorFormateado;
            } else {
                // Manejar el caso en el que el valor no sea un número válido
                console.error('El valor no es un número válido:', valor);
                return valor;
            }
        },
        //   xmlToJson('<?xml version="1.0" encoding="UTF-8"?><atom:entry xmlns:atom="http://www.w3.org/2005/Atom" xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata"> <atom:content type="application/xml"> <m:properties> <d:Pernr>800001</d:Pernr> <d:Approve>X</d:Approve> </m:properties> </atom:content> <atom:link rel="http://schemas.microsoft.com/ado/2007/08/dataservices/related/ToLeaveItem" type="application/atom+xml;type=feed" title="ZHR_APP_SRV.Header_Item"> <m:inline> <atom:feed> <atom:entry> <atom:content type="application/xml"> <m:properties> <d:Pernr></d:Pernr> <d:Index>0</d:Index> <d:RequestId>74867AF30B3A1ED4BDA9EDC88782C0EC</d:RequestId> </m:properties> </atom:content> </atom:entry> </atom:feed> </m:inline> </atom:link> </atom:entry>');


    });

});
