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
            MODEL = this.getOwnerComponent().getModel();
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
                delay: 0,
                ordenCompra: MODEL.getProperty("/Factura/pedido")
            });

            this.setModel(ordenModel, "ordenView");
            sap.ui.core.UIComponent.getRouterFor(this).getRoute("orden").attachPatternMatched(this._onOrdenMatched, this);

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
                    let data = detalleFactura;
                    debugger
                    sap.ui.getCore().setModel(new JSONModel({ "Posiciones":data }), "PosicionesDetalle")
                    sap.ui.core.BusyIndicator.show();
                    that.getRouter().navTo("detalle", {
                        codigoSolicitud: sPreviousHash.split("/")[1],
                        proveedor: sPreviousHash.split("/")[2],
                        posiciones: "1"
                    },
                        true);
                }
                else {
                    history.go(-1);
                }

            } else {
                sap.ui.core.BusyIndicator.show();
                this.getRouter().navTo("solicitudes", {}, true);
            }
        },
        onNavSolicitudes: function(){
            sap.ui.core.BusyIndicator.show();
            this.getRouter().navTo("solicitudes", {}, true);
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

        onValidarIndicadorImpuesto: function () {
            let object = { "valid": true, "mensaje": [] };
            const table = this.getView().byId("idTableOrdenes");
            let data = table.getSelectedContextPaths();

            $.each(data, function (i, item) {
                let element = MODEL.getProperty(item);
                if (element.MWSKZ == "") {
                    object.valid = false;
                    object.mensaje.push("El pedido " + element.EBELN + " no cuenta con indicador de impuesto. Por favor actualizar desde la tx me22n");
                }

            });
            return object;
        },
        formatMessages: function (Mensaje) {
            let NuevoMensaje = "";
            let count = 0;
            Mensaje.map((mensaje) => {
                count++;
                NuevoMensaje = NuevoMensaje + count + ". " + mensaje + "\n" /*.<br>"*/; 
            });
            return NuevoMensaje;
        },
        onAgregarOrdenes: async function () {
            let object = that.onValidarIndicadorImpuesto();
            if (!object.valid) {                
                let formattermessage = that.formatMessages(object.mensaje);
                MessageBox.warning(
                    formattermessage,
                    {
                        title: "Falta indicador de impuesto.",
                        actions: [MessageBox.Action.CLOSE],
                        //details: htmlmessage
                    }
                );
                return;
            }
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
                    NETPR: 0,
                    Waers: rowInvoice.Waers
                };
                var impTotal = 0.00;
                var rowDetails = [];
                let sumatoria = 0;
                detalleFactura = selectedPaths.map(item => {
                    let element = MODEL.getProperty(item);
                    sumatoria = sumatoria + (parseFloat(that.convertirFormato(element.NETPR)) * parseFloat(that.convertirFormato(element.MENGE)) );
                    MODEL.setProperty("/Factura/pedido", element.EBELN);
                    return MODEL.getProperty(item);
                });
                MODEL.setProperty("/Factura/conformidades/results", detalleFactura);

                sap.ui.getCore().setModel(new JSONModel({ "TotalNETPR": sumatoria }), "TotalNETPR")
                var oDetailInvoiceModel = new JSONModel(rowDetails);
                MODEL.setProperty("/Ordenes", []);
                this.onNavBack(detalleFactura);
            } else {
                MessageBox.error("Debe seleccionar por lo menos un registro.");
            }
        },
        convertirFormato(valor) {
            // Reemplazar las comas con una cadena vacía
            const valorSinComas = valor.replace(/,/g, '');

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
        onBuscarOrdenes: async function () {
            sap.ui.core.BusyIndicator.show();
            const busqueda = ordenModel.getProperty("/Busqueda");
            const filters = [];
            let lifnr = sap.ui.getCore().getModel("Lifnr").getData().Lifnr;            
            filters.push(new Filter("IR_BUKRS", "EQ", "1000"));
            filters.push(new Filter("IR_LIFNR", "EQ", /*"0000000034"*/lifnr));
            //filters.push(new Filter("I_LOEKZ", "EQ", "X"));
            filters.push(new Filter("I_ELIKZ", "EQ", "X"));
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
            MODEL.setProperty("/Ordenes", posiciones);
            sap.ui.core.BusyIndicator.hide();
        },
        onLimpiarFiltros: function () {
            that.byId("mtIptOrdenCompra").setTokens([]);
            that.byId("mtIptDescMaterial").setTokens([]);
            that.byId("mtIptConformidades").setTokens([]);
            //ordenModel.setProperty("/Busqueda", {});
            //this._applySearch([]);
        },
        onBusquedaRapida: function (event) {
            const query = event.getParameter("newValue");
            const filters = [
                new Filter({
                    filters: [
                        new Filter("BELNR", "Contains", query),
                        //new Filter("BUZEI", "Contains", query),
                        new Filter("EBELN", "Contains", query),
                        //new Filter("EBELP", "Contains", query),
                        new Filter("MATNR", "Contains", query),
                        new Filter("TXZ01", "Contains", query),                      
                       
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
            let lifnr = sap.ui.getCore().getModel("Lifnr");
            if (lifnr == undefined) {
                that.onNavSolicitudes();
                return;
            }       
                 
            MODEL.setProperty("/Ordenes", []);
            this.byId("idTableOrdenes").removeSelections();
            ordenModel.setProperty("/busy", false);
            ordenModel.setProperty("/Busqueda", {});
            let parameters = { filters: [] };
            lifnr = sap.ui.getCore().getModel("Lifnr").getData().Lifnr;
            let oMultiInput1 = that.byId("mtIptOrdenCompra");
            oMultiInput1.setTokens([]);
            if (MODEL.getProperty("/Factura/pedido") != "" && MODEL.getProperty("/Factura/pedido") != undefined) {
                let oNewToken = new sap.m.Token({
                    key: MODEL.getProperty("/Factura/pedido"), // Asigna el valor deseado para la key
                    text: MODEL.getProperty("/Factura/pedido") // Puedes asignar un texto opcional al token
                });
                oMultiInput1.addToken(oNewToken);
            }


            /*parameters.filters.push(new Filter("IR_BUKRS", FilterOperator.EQ, "1000"));
            parameters.filters.push(new Filter("IR_LIFNR", FilterOperator.EQ, lifnr));
            //parameters.filters.push(new Filter("I_LOEKZ", FilterOperator.EQ, "X"));
            parameters.urlParameters = {};
            const request = await this.readEntity(ODATA_SAP, "/getOrdenCompraSet", parameters);
            var posiciones = JSON.parse(request.results[0].ET_DATA);
            $.each(posiciones, function (i, item) {
                item.NETPR = (item.NETPR).toString();
                item.MENGE = (item.MENGE).toString();
            });
            MODEL.setProperty("/Ordenes", posiciones);
            //this._seleccionarTabla(posiciones);
            */
            
            that.onBuscarOrdenes();
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
