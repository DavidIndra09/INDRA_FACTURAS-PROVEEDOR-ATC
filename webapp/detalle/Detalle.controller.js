sap.ui.define([
    "../controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "../model/formatter",
    "sap/m/MessageBox",
], function (BaseController, JSONModel, History, Filter, FilterOperator, formatter, MessageBox) {
    "use strict";

    let that,
        viewModel,
        facturaModel,
        AdjuntosOriginal = [],
        AdjuntosEliminados = [],
        ODATA_SAP;

    return BaseController.extend("usil.com.createinvoice.atc.detalle.Detalle", {

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
            // Model used to manipulate control states. The chosen values make sure,
            // detail page shows busy indication immediately so there is no break in
            // between the busy indication for loading the view's meta data
            viewModel = new JSONModel({
                busy: true,
                delay: 0
            });


            facturaModel = this.getOwnerComponent().getModel("facturaModel");
            ODATA_SAP = this.getOwnerComponent().getModel("ODATA_SAP");
            this.getRouter().getRoute("detalle").attachPatternMatched(this._onDetalletMatched, this);
            this.setModel(viewModel, "detalleView");
            this.setModel(new JSONModel([]), "Adjuntos");
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

        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */

        /**
         * Binds the view to the object path.
         * @function
         * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
         * @private
         */
        _onDetalletMatched: function (oEvent) {
            if (that.getOwnerComponent().getModel("oCabecera")) {
                var oParameters = oEvent.getParameters();
                let oObject = that.getOwnerComponent().getModel("oCabecera").getData();
                //oObject.codigo = "20297868790";
                //oObject.proveedor = "Indra Peru S.A.";
                oObject.total = (Number(oObject.IMPORT).toFixed(2)) /* Number(oObject.IGV)).toFixed(2)*/;

                that.mostrarDetalle(oParameters.arguments.codigoSolicitud, oObject, oParameters.arguments.posiciones);
                that.getOwnerComponent().getModel("oCabecera").refresh(true);
                const resourceBundle = this.getResourceBundle();
                viewModel.setProperty("/detalleViewTitle", resourceBundle.getText("detalleViewTitle", [oParameters.arguments.codigoSolicitud]));
                viewModel.setProperty("/detalleViewSubTitle", resourceBundle.getText("detalleViewSubTitle", [oParameters.arguments.proveedor]));
                viewModel.setProperty("/busy", false);
                viewModel.setProperty("/busy", false);
            } else {
                viewModel.setProperty("/busy", false);
                that.onNavBack();
            }

            // var codigoSolicitud =  oEvent.getParameter("arguments").codigoSolicitud;
            // facturaModel.metadataLoaded().then( function () {
            //     const detailPath = facturaModel.createKey("Facturas",{
            //         codigoSolicitud: codigoSolicitud
            //     });
            //     this._bindView("/" + detailPath);
            // }.bind(this));
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
                model: "facturaModel",
                events: {
                    change: this._onBindingChange.bind(this),
                    dataRequested: function () {
                        viewModel.setProperty("/busy", true);
                    },
                    dataReceived: function () {
                        viewModel.setProperty("/busy", false);
                    }
                }
            });
        },

        _onBindingChange: function () {
            const oView = this.getView(),
                oElementBinding = oView.getElementBinding("facturaModel"),
                contexto = oElementBinding.getBoundContext();

            // No data for the binding
            if (!contexto) {
                this.getRouter().getTargets().display("objectNotFound");
                return;
            }

            const resourceBundle = this.getResourceBundle();
            const codigoSolicitud = contexto.getObject().codigoSolicitud;
            viewModel.setProperty("/detalleViewTitle", resourceBundle.getText("detalleViewTitle", [codigoSolicitud]));
            viewModel.setProperty("/busy", false);
        },

        mostrarDetalle: function (sCODEFACT, oCabecera, posiciones) {
            sap.ui.core.BusyIndicator.show(0);
            let aFilters = [];
            aFilters.push(new Filter("I_SOLFAC", FilterOperator.EQ, sCODEFACT));
            aFilters.push(new Filter("I_BUKRS", FilterOperator.EQ, "1000"));
            ODATA_SAP.read("/getDetailSolFactSet", {
                filters: aFilters,
                success: function (data) {
                    sap.ui.core.BusyIndicator.hide();
                    let Detalle = data.results[0].ET_DET;
                    let Documentos = data.results[0].ET_DOC;
                    let aLista = JSON.parse(Detalle);
                    if (posiciones.length > 0) {
                        let posicionesParse = JSON.parse(posiciones);
                        aLista.push(...posicionesParse);
                    }
                    $.each(aLista, function (i, item) {
                        item.WAERS = oCabecera.WAERS;
                    });
                    let aListaDocumentos = JSON.parse(Documentos);
                    let adjuntos = [];
                    $.each(aListaDocumentos, function (i, item) {

                        adjuntos.push({
                            "lastModifiedDate": that.convertirCadenaAFecha(item.DATUM),
                            "name": item.FILENAME,
                            "type": item.FILETYPE,
                            "mimeType": item.FILETYPE,
                            "solfac": item.SOLFAC,
                            //"posnr": item.POSNR,
                            "base64": item.BASE64,
                            "actions": (oCabecera.DescripcionEstado == "Creado") ? true : false
                        });
                    });

                    let oModelLista = new JSONModel(aLista);
                    that.byId("idtablaFactura").setModel(oModelLista);

                    that.getView().byId("AdjuntosDetalle").setModel(new JSONModel({ "Adjuntos": adjuntos }));
                    AdjuntosOriginal = [...adjuntos];
                },
                error: function (err) {
                    var error = err;
                    console.log(error);
                    MessageBox.error("Error al listar el detalle de la factura");
                    sap.ui.core.BusyIndicator.hide();
                }
            });
        },
        convertirCadenaAFecha(cadenaFecha) {
            // Dividir la cadena en partes: año, mes, día
            const partesFecha = cadenaFecha.split('-');

            // Crear un objeto Date con las partes de la fecha
            // Nota: El mes en JavaScript es 0-indexado, por lo que restamos 1 al mes
            const fecha = new Date(partesFecha[0], partesFecha[1] - 1, partesFecha[2]);

            return fecha;
        },
        onCargaAdjuntos: async function (event) {
            const adjuntos = that.getView().byId("AdjuntosDetalle").getModel().getData().Adjuntos;
            const files = event.getParameter("files");
            const control = event.getSource();

            if (files.length > 0) {
                const file = files[0];
                const base64String = await that.readFileAsBase64(file);
                adjuntos.push({
                    "lastModifiedDate": new Date(),
                    "name": file.name.split(".")[0],
                    "type": "." + file.name.split(".").pop(),
                    "mimeType": file.type,
                    "base64": base64String
                });
                that.getView().byId("AdjuntosDetalle").setModel(new JSONModel({ "Adjuntos": adjuntos }));
            }
            //control.setValue("");
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
            var oTable = that.getView().byId("AdjuntosDetalle");
            var oModel = oTable.getModel();
            var aItems = oModel.getProperty("/Adjuntos");
            sap.m.MessageBox.confirm("¿Estás seguro de que deseas eliminar este archivo?", {
                title: "Confirmar eliminación",
                onClose: function (oAction) {
                    if (oAction === sap.m.MessageBox.Action.OK) {
                        AdjuntosEliminados.push(aItems[iIndex]);
                        aItems.splice(iIndex, 1);
                        oModel.setProperty("/Adjuntos", aItems);
                    }
                }
            });
        },
        _getDataFactura: function () {

            let posiciones = that.byId("idtablaFactura").getModel().getData();
            let adjuntos = that.getView().byId("AdjuntosDetalle").getModel().getData().Adjuntos;
            let cabecera = that.getOwnerComponent().getModel("oCabecera").getData();

            let posnr = 0;
            const adjuntoModel = adjuntos.map(item => {
                posnr = posnr + 10
                return {
                    "POSNR": posnr,
                    "DATUM": that.convertirFechaAFormatoYMD(item.lastModifiedDate),
                    "BASE64": item.base64,
                    "SOLFAC": cabecera.SOLFAC,
                    "FILETYPE": item.type,
                    "FILENAME": item.name,
                    "BORRADO": "",
                    "FBORRA": "",
                    "UBORRA": "",
                    "BUKRS": "1000"
                }
            });
            $.each(AdjuntosEliminados, function (i, item) {
                let find = AdjuntosOriginal.find(element => element.base64 == item.base64);
                if (find) {
                    posnr = posnr + 10
                    adjuntoModel.push({
                        "POSNR": posnr,//item.posnr,
                        "DATUM": that.convertirFechaAFormatoYMD(item.lastModifiedDate),
                        "BASE64": item.base64,
                        "SOLFAC": cabecera.SOLFAC,
                        "FILETYPE": item.type,
                        "FILENAME": item.name,
                        "BORRADO": "X",
                        "FBORRA": that.convertirFechaAFormatoYMD(new Date()),
                        "UBORRA": sap.ui.getCore().getModel("USERIAS").getData().USERIAS,
                        "BUKRS": "1000"
                    });
                }
            });

            const conformidades = posiciones.map(item => {
                return {
                    "mandt": "",
                    "bukrs": item.BUKRS,
                    "lifnr": sap.ui.getCore().getModel("Lifnr").getData().Lifnr,
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
                    "belnr": item.BELNR,
                    "solfac": item.SOLFAC
                }
            });

            let oReturn = {
                "I_LIFNR": sap.ui.getCore().getModel("Lifnr").getData().Lifnr,
                "I_FACTUR": cabecera.FACTUR,
                "I_FEMISI": cabecera.FEMISI,
                "I_IMPORT": cabecera.IMPORT.toString(),
                "IT_DOC": JSON.stringify(adjuntoModel),
                "IT_DET": JSON.stringify(conformidades),
                "I_SOLFAC": cabecera.SOLFAC
            }

            return oReturn;
        },
        actualizarFactura: async function () {
            sap.ui.core.BusyIndicator.show()
            const data = that._getDataFactura();
            const request = await that.createEntity(ODATA_SAP, "/crearSolFactSet", data);
            const type = "success";
            sap.ui.core.BusyIndicator.hide()
            MessageBox[type](request.E_MSG, {
                onClose: function () {
                    ODATA_SAP.refresh();
                    sap.ui.core.BusyIndicator.hide()
                    that.getRouter().navTo("solicitudes", {}, false);
                }.bind(this)
            });

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
        onNavOrdenes: function () {
            this.getRouter().navTo("orden", {}, false);
        },

    });

});
