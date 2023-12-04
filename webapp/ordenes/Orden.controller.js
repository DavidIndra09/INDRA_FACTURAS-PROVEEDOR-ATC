sap.ui.define([
    "../controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "sap/m/MessageBox",
    "../model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    'sap/m/Token',
], function (
    BaseController,
    JSONModel,
    History,
    MessageBox,
    formatter,
    Filter,
    FilterOperator,
    Token
) {
    "use strict";
    let MODEL,
        that,
        ordenModel,
        ODATA_SAP;
    return BaseController.extend("usil.com.createinvoice.atc.ordenes.Orden", {

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
            let oMultiInput1 = that.byId("mtIptOrdenCompra");
            let oMultiInput2 = that.byId("mtIptDescMaterial");
            let oMultiInput3 = that.byId("mtIptConformidades");
            // add validator
            let fnValidator = function (args) {
                let text = args.text;

                return new Token({ key: text, text: text });
            };
            oMultiInput1.addValidator(fnValidator);
            oMultiInput2.addValidator(fnValidator);
            oMultiInput3.addValidator(fnValidator);
            ODATA_SAP = this.getOwnerComponent().getModel("ODATA_SAP");
            ordenModel = new JSONModel({
                busy: true,
                delay: 0
            });
            sap.ui.core.UIComponent.getRouterFor(this).getRoute("orden").attachPatternMatched(this._onOrdenMatched, this);
            this.setModel(ordenModel, "ordenView");
            MODEL = this.getOwnerComponent().getModel();
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
        onNavBack: function (detalleFactura) {
            var sPreviousHash = History.getInstance().getPreviousHash();
            if (sPreviousHash !== undefined) {
                // eslint-disable-next-line sap-no-history-manipulation
                if (sPreviousHash.includes("Detalle")) {                    
                    let data = JSON.stringify(detalleFactura)
                    that.getRouter().navTo("detalle", {
                        codigoSolicitud: sPreviousHash.split("/")[1],
                        proveedor: sPreviousHash.split("/")[2],
                        posiciones: data
                    },
                        true);
                }
                else {
                    history.go(-1);
                }

            } else {
                this.getRouter().navTo("factura", { codigoSolicitud: "N" }, true);
            }
        },


        onUpdateFinished: function (oEvent) {
            // update the worklist's object counter after the table update
            var sTitle,
                oTable = oEvent.getSource(),
                iTotalItems = oEvent.getParameter("total");
            // only update the counter if the length is final and
            // the table is not empty
            if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
                sTitle = this.getResourceBundle().getText("ordenTableTitleCount", [iTotalItems]);
            } else {
                sTitle = this.getResourceBundle().getText("ordenTableTitle");
            }
            ordenModel.setProperty("/ordenTableTitle", sTitle);
        },

        onAgregarOrdenes: async function () {
            const table = this.getView().byId("idTableOrdenes");
            const selectedPaths = table.getSelectedContextPaths();
            let detalleFactura;
            let sStatus;

            if (selectedPaths.length > 0) {
                var rowInvoice = MODEL.getProperty(selectedPaths[0]);
                var oFormData = {
                    Bukrs: rowInvoice.Bukrs,
                    Butxt: rowInvoice.Butxt,
                    Nrinv: "",
                    Dtinv: "",
                    Netwr: 0,
                    Waers: rowInvoice.Waers
                };

                var impTotal = 0.00;
                var rowDetails = [];

                detalleFactura = selectedPaths.map(item => {
                    return MODEL.getProperty(item);
                });
                MODEL.setProperty("/Factura/conformidades/results", detalleFactura);

                var oDetailInvoiceModel = new JSONModel(rowDetails);
                MODEL.setProperty("/Ordenes", []);
                this.onNavBack(detalleFactura);
            } else {
                MessageBox.error("Debe seleccionar por lo menos un registro.");
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
                    impTotalDel += oItems[j].NETWR;
                }
                // sap.that.updateAmount(impTotalDel);

                table.removeSelections();
            } else {
                MessageBox.error("Debe seleccionar al menos un registro.");
            }
        },
        onBuscarOrdenes: async function () {
            const busqueda = ordenModel.getProperty("/Busqueda");
            const filters = [];
            let lifnr = sap.ui.getCore().getModel("Lifnr").getData().Lifnr;
            filters.push(new Filter("IR_BUKRS", "EQ", "1000"));
            filters.push(new Filter("IR_LIFNR", "EQ", /*"0000000034"*/lifnr));
            //filters.push(new Filter("I_LOEKZ", "EQ", "X"));
            this.getView().byId("mtIptOrdenCompra").getTokens().map(function (token) {
                filters.push(new Filter("IR_EBELN", "EQ", token.getKey()));
            });
            this.getView().byId("mtIptConformidades").getTokens().map(function (token) {
                filters.push(new Filter("IR_BELNR", "EQ", token.getKey()));
            });
            this.getView().byId("mtIptDescMaterial").getTokens().map(function (token) {
                filters.push(new Filter("IR_MATNR", "EQ", token.getKey()));
            });

            let parameters = { filters: filters };

            const request = await this.readEntity(ODATA_SAP, "/getOrdenCompraSet", parameters);
            var posiciones = JSON.parse(request.results[0].ET_DATA);
            MODEL.setProperty("/Ordenes", posiciones);
        },
        onLimpiarFiltros: function () {
            ordenModel.setProperty("/Busqueda", {});
            this._applySearch([]);
        },
        onBusquedaRapida: function (event) {
            const query = event.getParameter("newValue");
            const filters = [
                new Filter({
                    filters: [
                        new Filter("conformidad", "Contains", query),
                        new Filter("posicionConformidad", "StartsWith", query),
                        new Filter("ordenCompra", "Contains", query),
                        new Filter("posicionOrden", "StartsWith", query),
                        new Filter("codigoMaterial", "Contains", query),
                        new Filter("descripcionMaterial", "Contains", query),
                        new Filter("cantidad", "Contains", query)
                    ],
                    and: false
                })
            ];

            this._applySearch(filters);
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
        _onOrdenMatched: async function (oEvent) {
            MODEL.setProperty("/Ordenes", []);
            this.byId("idTableOrdenes").removeSelections();
            ordenModel.setProperty("/busy", false);
            ordenModel.setProperty("/Busqueda", {});
            let parameters = { filters: [] };
            let lifnr = sap.ui.getCore().getModel("Lifnr").getData().Lifnr;
            parameters.filters.push(new Filter("IR_BUKRS", FilterOperator.EQ, "1000"));
            parameters.filters.push(new Filter("IR_LIFNR", FilterOperator.EQ, lifnr));
            //parameters.filters.push(new Filter("I_LOEKZ", FilterOperator.EQ, "X"));
            parameters.urlParameters = {};
            const request = await this.readEntity(ODATA_SAP, "/getOrdenCompraSet", parameters);
            var posiciones = JSON.parse(request.results[0].ET_DATA);
            MODEL.setProperty("/Ordenes", posiciones);
            //this._seleccionarTabla(posiciones);
        },

        _seleccionarTabla: function (posiciones) {
            const tabla = this.getView().byId("idTableOrdenes");
            const items = tabla.getItems();

            let element;

            items.forEach(item => {
                element = item.getBindingContext().getObject();
                if (!posiciones || posiciones.findIndex(pos => element.conformidad === pos.conformidad) === -1) {
                    tabla.setSelectedItem(item, false);
                } else {
                    tabla.setSelectedItem(item, true);
                }
            });
        },

        /**
         * Internal helper method to apply both filter and search state together on the list binding
         * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
         * @private
         */
        _applySearch: function (aTableSearchState) {
            var oTable = this.byId("idTableOrdenes");
            oTable.getBinding("items").filter(aTableSearchState, "Application");
            // changes the noDataText of the list in case there are no filter results
            if (aTableSearchState.length !== 0) {
                ordenModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("solicitudesNoDataWithSearchText"));
            }
        }
    });

});
