sap.ui.define([
    "../controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "../model/formatter"
], function (BaseController, JSONModel, History, Filter, FilterOperator, formatter) {
    "use strict";

    let that,
        viewModel,
        facturaModel,
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
                oObject.codigo = "20297868790";
                oObject.proveedor = "Indra Peru S.A.";
                oObject.total = (Number(oObject.NETWR) * Number(oObject.IGV)).toFixed(2);
                //that.mostrarDetalle(oObject.CODEFACT);
                that.getOwnerComponent().getModel("oCabecera").refresh(true);
                const resourceBundle = this.getResourceBundle();
                viewModel.setProperty("/detalleViewTitle", resourceBundle.getText("detalleViewTitle", [oParameters.arguments.codigoSolicitud]));
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

        mostrarDetalle: function (sCODEFACT) {
            sap.ui.core.BusyIndicator.show(0);
            let aFilters = [];
            let oFilter = new Filter("is_fact_prov_c", FilterOperator.EQ, sCODEFACT);
            aFilters.push(oFilter);

            ODATA_SAP.read("/listarDetalleFacturaSet", {
                filters: aFilters,
                success: function (data) {
                    sap.ui.core.BusyIndicator.hide();
                    let sJson = data.results[0].et_data;
                    let aLista = JSON.parse(sJson);
                    console.log(aLista);
                    let oModelLista = new JSONModel(aLista);
                    that.byId("reviewTable").setModel(oModelLista);
                },
                error: function (err) {
                    var error = err;
                    console.log(error);
                    MessageBox.error("Error al listar el detalle de la factura");
                    sap.ui.core.BusyIndicator.hide();
                }
            });
        },
        onCargaAdjuntos: async function (event) {
            const adjuntos = that.getView().getModel("Adjuntos").getData();
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
                        aItems.splice(iIndex, 1);
                        oModel.setProperty("/Adjuntos", aItems);
                    }
                }
            });
        }

    });

});
