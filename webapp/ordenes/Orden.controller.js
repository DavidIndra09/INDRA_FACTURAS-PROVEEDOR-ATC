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
        ParamMoneda = "",
        ParamNavFrom = "",
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
            let oMultiInput4 = that.byId("mtIptClaseCondicion");
            // add validator
            let fnValidator = function (args) {
                let text = args.text;

                return new Token({ key: text, text: text });
            };
            oMultiInput4.addValidator(fnValidator);
            oMultiInput1.addValidator(fnValidator);
            oMultiInput2.addValidator(fnValidator);
            oMultiInput3.addValidator(fnValidator);
            ODATA_SAP = this.getOwnerComponent().getModel("ODATA_SAP");
            ordenModel = new JSONModel({
                busy: true,
                delay: 0,
                ordenCompra: MODEL.getProperty("/Factura/pedido"),
                visibleFilters: true
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
        onNavBack: function (detalleFactura, value) {
            var sPreviousHash = History.getInstance().getPreviousHash();
            
            if (ParamNavFrom !== "") {
                // eslint-disable-next-line sap-no-history-manipulation
                if (ParamNavFrom.includes("detalle")) {
                    let data = detalleFactura;
                    sap.ui.getCore().setModel(new JSONModel({ "Posiciones": data, "CondPedidoTable": value, "PosicionesTable": !value }), "Detalle")
                    sap.ui.core.BusyIndicator.show();
                    that.getRouter().navTo("detalle", {
                        codigoSolicitud: "d",//sPreviousHash.split("/")[1],
                        proveedor: "d",//sPreviousHash.split("/")[2],
                        posiciones: "1",
                        navFrom:"Ordenes"
                    },
                        true);
                }
                else if(ParamNavFrom.includes("factura")){
                    this.getRouter().navTo("factura", {}, true); 
                }
                else {
                    history.go(-1);
                }

            } else {
                sap.ui.core.BusyIndicator.show();
                this.getRouter().navTo("solicitudes", {}, true);
            }
        },
        onNavSolicitudes: function () {
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
                if (element != undefined) {
                    if (element.MWSKZ == "") {
                        object.valid = false;
                        object.mensaje.push("El pedido " + element.EBELN + " no cuenta con indicador de impuesto. Por favor actualizar desde la tx me22n");
                    }
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
        onEvaluarAgregar: async function () {
            let tableOC = that.byId("idTableOrdenes").getVisible();
            if (tableOC) {
                that.onAgregarOrdenes();
            }
            else {
                that.onAgregarCondicionPedido();
            }
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
                var pedido = [];
                if (table.isAllSelectableSelected() && this.getView().byId("searchField").getValue() == "") {
                    var Allordenes = table.getModel().getData().Ordenes;
                    detalleFactura = Allordenes.map(item => {
                        sumatoria = sumatoria + (parseFloat(that.convertirFormato(item.NETPR)) * parseFloat(that.convertirFormato(item.MENGE_PEND)));
                        item.TOTAL = ((parseFloat(that.convertirFormato(item.NETPR)) * parseFloat(that.convertirFormato(item.MENGE_PEND)))).toFixed(2);
                        var find = pedido.find(fore => fore == item.EBELN)
                        if (!find) {
                            pedido.push(item.EBELN);
                        }
                        return item;
                    });
                }
                else if (table.isAllSelectableSelected() && this.getView().byId("searchField").getValue() != "") {
                    var aLastContextData = table.getBinding("items").aLastContextData;
                    var jsonString = '[' + aLastContextData.join(',') + ']';
                    var parsedDataArray= [];

                    try {
                        parsedDataArray = JSON.parse(jsonString);
                        console.log(parsedDataArray);
                    } catch (error) {
                        console.error("Error parsing JSON:", error);
                    }
                    detalleFactura = parsedDataArray.map(item => {
                        sumatoria = sumatoria + (parseFloat(that.convertirFormato(item.NETPR)) * parseFloat(that.convertirFormato(item.MENGE_PEND)));
                        item.TOTAL = ((parseFloat(that.convertirFormato(item.NETPR)) * parseFloat(that.convertirFormato(item.MENGE_PEND)))).toFixed(2);
                        var find = pedido.find(fore => fore == item.EBELN)
                        if (!find) {
                            pedido.push(item.EBELN);
                        }
                        return item;
                    });
                }
                else {
                    detalleFactura = selectedPaths.map(item => {
                        let element = MODEL.getProperty(item);
                        sumatoria = sumatoria + (parseFloat(that.convertirFormato(element.NETPR)) * parseFloat(that.convertirFormato(element.MENGE_PEND)));
                        element.TOTAL = ((parseFloat(that.convertirFormato(element.NETPR)) * parseFloat(that.convertirFormato(element.MENGE_PEND)))).toFixed(2);

                        var find = pedido.find(fore => fore == element.EBELN)
                        if (!find) {
                            pedido.push(element.EBELN);
                        }
                        return MODEL.getProperty(item);
                    });

                }

                MODEL.setProperty("/Factura/pedido", pedido.join(";"));
                MODEL.setProperty("/Factura/conformidades/results", detalleFactura);
                MODEL.setProperty("/Factura/condpedido/results", []);
                MODEL.setProperty("/Factura/visibleconpedido", false);
                MODEL.setProperty("/Factura/visiblepos", true);

                sap.ui.getCore().setModel(new JSONModel({ "TotalNETPR": sumatoria }), "TotalNETPR")
                var oDetailInvoiceModel = new JSONModel(rowDetails);
                MODEL.setProperty("/Ordenes", []);
                this.onNavBack(detalleFactura, false);
            } else {
                MessageBox.error("Debe seleccionar por lo menos un registro.");
            }
        },
        onAgregarCondicionPedido: async function () {            
            const table = this.getView().byId("idTableCondicionesPedido");
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
                var pedido = [];
                if (table.isAllSelectableSelected()) {
                    var AllCondicionPedido = table.getModel().getData().CondPedido;
                    detalleFactura = AllCondicionPedido.map(item => {
                        sumatoria = sumatoria + (parseFloat(that.convertirFormato(item.IMPORTECOND)));
                        item.TOTAL = ((parseFloat(that.convertirFormato(item.IMPORTECOND)))).toFixed(2);
                        var find = pedido.find(fore => fore == item.EBELN)
                        if (!find) {
                            pedido.push(item.EBELN);
                        }
                        return item;
                    });
                    //sumatoria = that.sumarPorEBELN(selectedPaths);

                }
                else {
                    detalleFactura = selectedPaths.map(item => {
                        let element = MODEL.getProperty(item);
                        sumatoria = sumatoria + (parseFloat(that.convertirFormato(element.IMPORTECOND)));
                        element.TOTAL = ((parseFloat(that.convertirFormato(element.IMPORTECOND)))).toFixed(2);
                        var find = pedido.find(fore => fore == element.EBELN)
                        if (!find) {
                            pedido.push(element.EBELN);
                        }
                        return MODEL.getProperty(item);
                    });
                    //sumatoria = that.sumarPorEBELN(selectedPaths);

                }


                MODEL.setProperty("/Factura/pedido", pedido.join(";"));
                MODEL.setProperty("/Factura/conformidades/results", []);
                MODEL.setProperty("/Factura/condpedido/results", detalleFactura);
                MODEL.setProperty("/Factura/visibleconpedido", true);
                MODEL.setProperty("/Factura/visiblepos", false);

                sap.ui.getCore().setModel(new JSONModel({ "TotalNETPR": sumatoria }), "TotalNETPR")
                var oDetailInvoiceModel = new JSONModel(rowDetails);
                MODEL.setProperty("/CondPedido", []);
                this.onNavBack(detalleFactura, true);
            } else {
                MessageBox.error("Debe seleccionar por lo menos un registro.");
            }
        },
        sumarPorEBELN: function (selectedPaths) {
            let primerValorPorEBELN = {};
            let sumarTodos = false;

            selectedPaths.forEach(item => {
                let element = MODEL.getProperty(item);
                let ebeln = element.EBELN;
                let IMPORTECOND = parseFloat(that.convertirFormato(element.IMPORTECOND));
                let bsart = element.BSART;

                // Verificar si no hemos sumado IMPORTECOND para este EBELN
                if (primerValorPorEBELN[ebeln] === undefined) {
                    primerValorPorEBELN[ebeln] = IMPORTECOND;
                }

                // Verificar la condición de BSART
                if (bsart === "ZVEM") {
                    sumarTodos = true; // Establecer a true si encontramos al menos un BSART igual a ZVEM
                }
            });

            let resultado;

            if (sumarTodos) {
                // Sumar todos los valores de IMPORTECOND si al menos un BSART es igual a ZVEM
                resultado = Object.values(primerValorPorEBELN).reduce((total, valor) => total + valor, 0);
            } else {
                // Obtener solo el primer valor de IMPORTECOND para cada valor único de EBELN
                resultado = Object.values(primerValorPorEBELN).reduce((total, valor) => {
                    return total + valor;
                }, 0);
            }

            return resultado.toFixed(2);
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
        onEvaluarBusqueda: async function () {

            let tableOC = that.byId("idTableOrdenes").getVisible();
            if (tableOC) {
                that.onBuscarOrdenes();
            }
            else {
                that.ongetCondPedido();
            }
            //that.byId("SwitchTableOC").getState();
        },
        onBuscarOrdenes: async function () {
            try {
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
                if (request.results.length > 0) {
                    posiciones = JSON.parse(request.results[0].ET_DATA);
                    $.each(posiciones, function (i, item) {
                        item.NETPR = (item.NETPR).toString();
                        item.MENGE = (item.MENGE).toString();
                    });
                }
                else {
                    MessageBox.information(
                        "No existen pedidos confirmados para el proveedor seleccionado o ya existe una factura.",
                        {
                            title: "No se encontraron resultados",
                            actions: [MessageBox.Action.CLOSE],
                            //details: htmlmessage
                        }
                    );
                }
                //posiciones.sort((a, b) => a.BELNR - b.BELNR);
                MODEL.setProperty("/Ordenes", posiciones);
                that.getView().byId("tableHeader").setText("Posiciones (" + posiciones.length + ")");
                sap.ui.core.BusyIndicator.hide();
            } catch (error) {
                sap.ui.core.BusyIndicator.hide();
                MessageBox.error("El proceso tardó en responder, por lo que se cortó la comunicación en línea. Actualice la búsqueda para ver los mensajes o contacte al administrador del aplicativo.")

            }
        },
        ongetCondPedido: async function () {
            try {
                sap.ui.core.BusyIndicator.show();
                const busqueda = ordenModel.getProperty("/Busqueda");
                const filters = [];
                let lifnr = sap.ui.getCore().getModel("Lifnr").getData().Lifnr;
                filters.push(new Filter("IR_BUKRS", "EQ", "1000"));
                filters.push(new Filter("IR_LIFNR", "EQ", /*"0000000034"*/lifnr));
                //filters.push(new Filter("I_LOEKZ", "EQ", "X"));
                //filters.push(new Filter("I_ELIKZ", "EQ", "X"));
                this.getView().byId("mtIptOrdenCompra").getTokens().map(function (token) {
                    filters.push(new Filter("IR_EBELN", "EQ", token.getKey()));
                });
                this.getView().byId("mtIptClaseCondicion").getTokens().map(function (token) {
                    filters.push(new Filter("IR_KSCHL", "EQ", token.getKey()));
                });
                /*
                this.getView().byId("mtIptDescMaterial").getTokens().map(function (token) {
                    filters.push(new Filter("IR_MATNR", "EQ", token.getKey()));
                });*/

                let parameters = { filters: filters };

                const request = await this.readEntity(ODATA_SAP, "/getCondPedidoSet", parameters);
                var posiciones = [];
                if (request.results.length > 0) {                                    
                    posiciones = JSON.parse(request.results[0].ET_DATA);                    
                    var facturaMoneda = ParamMoneda;
                    posiciones.forEach(function(item) {
                        if (facturaMoneda === "COP") {
                            item.IMPORTECOND = item.KBETR;
                        } else if (facturaMoneda === "USD") {
                            item.IMPORTECOND = item.KWETR;
                        }
                    });                   
                }
                else {
                    MessageBox.information(
                        "No existen pedidos con condiciones para el proveedor seleccionado.",
                        {
                            title: "No se encontraron resultados",
                            actions: [MessageBox.Action.CLOSE],
                            //details: htmlmessage
                        }
                    );
                }
                //posiciones.sort((a, b) => a.BELNR - b.BELNR);                
                
                MODEL.setProperty("/CondPedido", posiciones);
                that.getView().byId("idTableCondicionesPedido").setSelectedContextPaths([]);
                that.getView().byId("tableHeaderCondPedido").setText("Condiciones (" + posiciones.length + ")");
                sap.ui.core.BusyIndicator.hide();
            } catch (error) {
                sap.ui.core.BusyIndicator.hide();
                MessageBox.error("El proceso tardó en responder, por lo que se cortó la comunicación en línea. Actualice la búsqueda para ver los mensajes o contacte al administrador del aplicativo.")

            }
        },
        onLimpiarFiltros: function () {
            that.byId("mtIptOrdenCompra").setTokens([]);
            that.byId("mtIptDescMaterial").setTokens([]);
            that.byId("mtIptConformidades").setTokens([]);
            that.byId("mtIptClaseCondicion").setTokens([]);
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
        onBusquedaRapidaCondiciones: function (event) {
            const query = event.getParameter("newValue");
            const filters = [
                new Filter({
                    filters: [
                        new Filter("KSCHL", "Contains", query),
                        new Filter("KNUMV", "Contains", query),
                        new Filter("EBELN", "Contains", query),
                        //new Filter("EBELP", "Contains", query),                                            

                    ],
                    and: false
                })
            ];

            this._applyCondiciones(filters);
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
            ParamMoneda = oEvent.getParameters().arguments.moneda 
            ParamNavFrom = oEvent.getParameters().arguments.navFrom 
            MODEL.setProperty("/Ordenes", []);
            MODEL.setProperty("/CondPedido", []);
            var tableOrdenes = this.getView().byId("idTableOrdenes");
            var tableCP = this.getView().byId("idTableCondicionesPedido");
            tableOrdenes.removeSelections([]);
            tableCP.removeSelections([]);
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

            //that.onBuscarOrdenes();
            that.onEvaluarBusqueda();
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
        },
        _applyCondiciones: function (aTableSearchState) {
            var oTable = this.byId("idTableCondicionesPedido");
            oTable.getBinding("items").filter(aTableSearchState, "Application");
            // changes the noDataText of the list in case there are no filter results
            if (aTableSearchState.length !== 0) {
                ordenModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("solicitudesNoDataWithSearchText"));
            }
        },
        onShowHideFilters: function (oEvent) {
            var classType = "sapUiSmallMarginTop";
            var state = oEvent.mParameters.state;

            if (oEvent.getSource().getId().includes("SwitchTableOC")) {
                that.byId("btnFilterBuscar").addStyleClass(classType);
                that.byId("btnFilterLimpiar").addStyleClass(classType);
                that.byId("idTableOrdenes").setVisible(false)
                that.byId("idTableCondicionesPedido").setVisible(true)
                that.byId("elementConformidades").setVisible(false);
                that.byId("elementDescMaterial").setVisible(false);
                that.byId("elementClaseCondicion").setVisible(true);
                that.byId("SwitchTableCP").setState(true)
                that.byId("SwitchTableOC").setState(false)
                that.ongetCondPedido();
            }
            else {
                that.byId("btnFilterBuscar").removeStyleClass(classType);
                that.byId("btnFilterLimpiar").removeStyleClass(classType);
                that.byId("idTableOrdenes").setVisible(true)
                that.byId("idTableCondicionesPedido").setVisible(false)
                that.byId("elementConformidades").setVisible(true);
                that.byId("elementDescMaterial").setVisible(true);
                that.byId("elementClaseCondicion").setVisible(false);
                that.byId("SwitchTableCP").setState(false)
                that.byId("SwitchTableOC").setState(false)

            }


        },
        onValidarMontoIngresado: function (oEvent) {
            var oInput = oEvent.getSource();
            var oContext = oInput.getBindingContext();

            var fMENGE_PEND = parseFloat(oEvent.getParameter("value"));
            var fMENGE_INGR = parseFloat(oContext.getProperty("MENGE_INGR"));
            var fMENGE_FACT = parseFloat(oContext.getProperty("MENGE_FACT"));

            // Validar que MENGE_PEND sea menor o igual a la diferencia entre MENGE_INGR y MENGE_FACT
            if (fMENGE_PEND > (fMENGE_INGR - fMENGE_FACT)) {
                // Si no es válido, mostrar un cuadro de mensaje de error y establecer el valor del input a 0
                MessageBox.error("Para el pedido " + oContext.getProperty("EBELN") + " no es posible facturar más cantidad de la Ingresada por MIGO.", {
                    onClose: function () {
                        oInput.setValue(0);
                    }
                });
            }
        }
    });

});
